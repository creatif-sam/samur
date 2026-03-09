import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // For each user, count their activities planned for today
    for (const user of users) {
      // Fetch today's planner data
      const { data: plannerDay } = await serviceSupabase
        .from('planner_days')
        .select('tasks')
        .eq('user_id', user.id)
        .eq('day', today)
        .single();
      
      const taskCount = plannerDay?.tasks?.length || 0;
      const message = taskCount > 0 
        ? `You have ${taskCount} ${taskCount === 1 ? 'activity' : 'activities'} planned for today`
        : 'Check your planner for today';
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications/send-internal`, {
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
