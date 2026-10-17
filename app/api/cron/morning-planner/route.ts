import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { zonedNow } from '@/lib/dates';
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries';
import { buildDayTasks } from '@/lib/planner/tasks';

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
    // For each user, count their activities planned for today
    for (const user of users) {
      // "Today" in the user's own time zone, including recurring tasks
      const { dateKey: today } = zonedNow(user.user_metadata?.timezone as string | undefined);
      const [dayRows, recurringRows] = await Promise.all([
        fetchDayRows(serviceSupabase, [user.id], today),
        fetchRecurringRows(serviceSupabase, [user.id], today),
      ]);

      const taskCount = buildDayTasks({ dateKey: today, userId: user.id, dayRows, recurringRows }).length;
      const message = taskCount > 0 
        ? `You have ${taskCount} ${taskCount === 1 ? 'activity' : 'activities'} planned for today`
        : 'Check your planner for today';
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://mastery.samuelgyasi.com'}/api/notifications/send-internal`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret}`
        },
        body: JSON.stringify({
          targetUserId: user.id,
          type: 'planner_reminder',
          title: 'Good Morning! ☀️',
          body: message,
          url: '/protected/planner'
        })
      });

      notificationsSent++;
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Morning planner cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
