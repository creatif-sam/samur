import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { addDays, daysBetween, zonedNow } from '@/lib/dates';

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

    // Deadlines count in each owner's local day; query a UTC window wide
    // enough to cover every time zone, then filter per owner
    const { data: { users } } = await serviceSupabase.auth.admin.listUsers();
    const timeZones = new Map((users ?? []).map(u => [u.id, u.user_metadata?.timezone as string | undefined]));
    const utcToday = zonedNow('UTC').dateKey;
    const windowStart = addDays(utcToday, -1);
    const windowEnd = addDays(utcToday, 9);
    const REMINDER_DAYS = new Set([1, 3, 7]);
    const daysLeftFor = (ownerId: string, due: string) =>
      daysBetween(zonedNow(timeZones.get(ownerId)).dateKey, due.slice(0, 10));
    const whenLabel = (daysLeft: number) =>
      daysLeft === 1 ? 'tomorrow' : daysLeft === 3 ? 'in 3 days' : 'in 1 week';

    let notificationsSent = 0;
    const send = async (targetUserId: string, title: string, body: string) => {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://mastery.samuelgyasi.com'}/api/notifications/send-internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret}`
        },
        body: JSON.stringify({ targetUserId, type: 'goal_deadline', title, body, url: '/protected/goals' })
      });
      notificationsSent++;
    };

    // 1. Goals with approaching deadlines
    const { data: goals } = await serviceSupabase
      .from('goals')
      .select('id, title, owner_id, due_date')
      .not('due_date', 'is', null)
      .neq('status', 'done')
      .gte('due_date', windowStart)
      .lte('due_date', windowEnd);

    for (const goal of goals ?? []) {
      if (!goal.owner_id) continue;
      const daysLeft = daysLeftFor(goal.owner_id, goal.due_date);
      if (!REMINDER_DAYS.has(daysLeft)) continue;
      await send(
        goal.owner_id,
        'Goal Deadline Approaching ⏰',
        daysLeft === 1 ? `Goal "${goal.title}" is due tomorrow!` : `Goal "${goal.title}" is due ${whenLabel(daysLeft)}`
      );
    }

    // 2. Visions with approaching target dates
    const { data: visions } = await serviceSupabase
      .from('visions')
      .select('id, title, owner_id, target_date')
      .not('target_date', 'is', null)
      .gte('target_date', windowStart)
      .lte('target_date', windowEnd);

    for (const vision of visions ?? []) {
      if (!vision.owner_id) continue;
      const daysLeft = daysLeftFor(vision.owner_id, vision.target_date);
      if (!REMINDER_DAYS.has(daysLeft)) continue;
      await send(
        vision.owner_id,
        'Vision Target Approaching 🎯',
        daysLeft === 1 ? `Vision "${vision.title}" target date is tomorrow!` : `Vision "${vision.title}" target date ${whenLabel(daysLeft)}`
      );
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Goal deadline cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
