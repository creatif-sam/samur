import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { addDays, zonedNow } from '@/lib/dates';
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries';
import { buildDayTasks, parseMinutes, reminderMinutes, type PlannerTask } from '@/lib/planner/tasks';

// The workflow calls this every ~5 minutes. A reminder fires on the first call
// at or after its time (each task picks how long before start), within a window
// a bit wider than the interval so a late call never skips one; already-sent
// reminders are deduped.
const WINDOW_MINUTES = 7
const MAX_LEAD_MINUTES = 60

export async function GET(request: Request) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceClient();

    // Get all users
    const { data: { users }, error: usersError } = await serviceSupabase.auth.admin.listUsers();

    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ ok: false, error: 'Failed to fetch users' });
    }

    let notificationsSent = 0;
    const dedupeSince = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const visionEmojis = new Map<string, string>();

    for (const user of users) {
      // Task times are in the user's local time (synced to their metadata by the app)
      const { dateKey: today, minutes: nowMinutes } = zonedNow(user.user_metadata?.timezone as string | undefined);

      // Near midnight, early tasks tomorrow can already be due for a reminder
      const days = [{ day: today, offset: 0 }];
      if (nowMinutes + MAX_LEAD_MINUTES >= 1440) days.push({ day: addDays(today, 1), offset: 1440 });

      const candidates: { task: PlannerTask; day: string; minutesUntilTask: number }[] = [];
      try {
        const recurringRows = await fetchRecurringRows(serviceSupabase, [user.id], days[days.length - 1].day);
        for (const { day, offset } of days) {
          const dayRows = await fetchDayRows(serviceSupabase, [user.id], day);
          const completed = new Set(dayRows[0]?.completed_task_ids ?? []);
          for (const task of buildDayTasks({ dateKey: day, userId: user.id, dayRows, recurringRows })) {
            if (completed.has(task.id)) continue;
            candidates.push({ task, day, minutesUntilTask: parseMinutes(task.start) + offset - nowMinutes });
          }
        }
      } catch (err) {
        console.error('Task reminders: failed to load planner for', user.id, err);
        continue;
      }

      for (const { task, day, minutesUntilTask } of candidates) {
        const lead = reminderMinutes(task);
        if (lead === null) continue;
        if (minutesUntilTask > lead || minutesUntilTask <= lead - WINDOW_MINUTES) continue;

        // Recurring tasks keep their id every day, so dedupe on a recent window
        const { data: existing } = await serviceSupabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'task_reminder')
          .eq('data->>taskId', task.id)
          .gte('created_at', dedupeSince)
          .limit(1);

        if (existing && existing.length > 0) continue;

        let visionEmoji = '⏰';
        if (task.vision_id) {
          if (!visionEmojis.has(task.vision_id)) {
            const { data: vision } = await serviceSupabase
              .from('visions')
              .select('emoji')
              .eq('id', task.vision_id)
              .maybeSingle();
            visionEmojis.set(task.vision_id, vision?.emoji || '⏰');
          }
          visionEmoji = visionEmojis.get(task.vision_id)!;
        }

        const title = minutesUntilTask <= 0
          ? `${visionEmoji} Starting now`
          : minutesUntilTask >= 60
          ? `${visionEmoji} Task in 1 hour`
          : `${visionEmoji} Task in ${minutesUntilTask} minute${minutesUntilTask === 1 ? '' : 's'}`;

        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://mastery.samuelgyasi.com'}/api/notifications/send-internal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`
          },
          body: JSON.stringify({
            targetUserId: user.id,
            type: 'task_reminder',
            title,
            body: `${task.text} starts at ${task.start}`,
            url: '/protected/planner',
            data: { taskId: task.id, taskStart: task.start, day },
            tag: `task-${task.id}-${day}`
          })
        });

        if (res.ok) notificationsSent++;
        else console.error('Task reminder send failed:', res.status, await res.text().catch(() => ''));
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Task reminders cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
