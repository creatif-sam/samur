import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { zonedNow } from '@/lib/dates';
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries';
import { buildDayTasks, parseMinutes } from '@/lib/planner/tasks';

// The workflow calls this every ~5 minutes. The window is a bit wider than the
// interval so a late call never skips a task; already-sent reminders are deduped.
const WINDOW_MINUTES = 7

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

      let dayRows, recurringRows;
      try {
        [dayRows, recurringRows] = await Promise.all([
          fetchDayRows(serviceSupabase, [user.id], today),
          fetchRecurringRows(serviceSupabase, [user.id], today),
        ]);
      } catch (err) {
        console.error('Task reminders: failed to load planner for', user.id, err);
        continue;
      }

      const tasks = buildDayTasks({ dateKey: today, userId: user.id, dayRows, recurringRows });
      if (tasks.length === 0) continue;

      const completedTaskIds = dayRows[0]?.completed_task_ids ?? [];

      for (const task of tasks) {
        if (completedTaskIds.includes(task.id)) continue;

        const minutesUntilTask = parseMinutes(task.start) - nowMinutes;
        if (minutesUntilTask < 0 || minutesUntilTask > WINDOW_MINUTES) continue;

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

        const title = minutesUntilTask === 0
          ? `${visionEmoji} Starting now`
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
            data: { taskId: task.id, taskStart: task.start, day: today }
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
