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

    // For each user, check if they have logged work today
    for (const user of users.users) {
      // Check if user has any creative work logs for today
      const { data: workLogs } = await supabase
        .from('creative_work')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1);

      // If no work logs found, send reminder
      if (!workLogs || workLogs.length === 0) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: user.id,
            type: 'work_log_reminder',
            title: 'Work Log Reminder 📝',
            body: 'Don\'t forget to log your creative work for today!',
            url: '/protected/readapp'
          })
        });

        notificationsSent++;
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Work log reminder cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
