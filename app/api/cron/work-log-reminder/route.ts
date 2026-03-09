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

    // For each user, check if they have logged work today
    for (const user of users) {
      // Check if user has any creative work logs for today
      const { data: workLogs } = await serviceSupabase
        .from('creative_work')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1);

      // If no work logs found, send reminder
      if (!workLogs || workLogs.length === 0) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications/send-internal`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`
          },
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
