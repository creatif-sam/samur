import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users?.users) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ ok: false, error: 'Failed to fetch users' });
    }

    let notificationsSent = 0;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // For each user, count their activities planned for today
    for (const user of users.users) {
      // Fetch today's planner data
      const { data: plannerDay } = await supabase
        .from('planner_days')
        .select('tasks')
        .eq('user_id', user.id)
        .eq('day', today)
        .single();
      
      const taskCount = plannerDay?.tasks?.length || 0;
      const message = taskCount > 0 
        ? `You have ${taskCount} ${taskCount === 1 ? 'activity' : 'activities'} planned for today`
        : 'Check your planner for today';
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
