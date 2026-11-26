import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { zonedNow } from '@/lib/dates';
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries';
import { buildDayTasks } from '@/lib/planner/tasks';
import { translate, type Language } from '@/lib/i18n';

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
      const lang: Language = user.user_metadata?.language === 'fr' ? 'fr' : 'en';
      // Top 3 not chosen yet (or the table not there yet): ask for it
      const { data: top3 } = await serviceSupabase
        .from('planner_priorities').select('items').eq('user_id', user.id).eq('day', today).maybeSingle();
      const hasTop3 = Array.isArray(top3?.items) && top3.items.length > 0;
      const message = [
        taskCount > 0
          ? translate(lang, 'You have {n} {n:activity|activities} planned for today.', { n: taskCount })
          : translate(lang, 'Check your planner for today.'),
        hasTop3 ? '' : translate(lang, 'Pick your Top 3 for the day.'),
      ].filter(Boolean).join(' ');
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://mastery.samuelgyasi.com'}/api/notifications/send-internal`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret}`
        },
        body: JSON.stringify({
          targetUserId: user.id,
          type: 'planner_reminder',
          title: translate(lang, 'Good Morning! ☀️'),
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
