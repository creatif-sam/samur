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

    // For each user, check if they have read today
    for (const user of users.users) {
      // Check if user has any reading logs for today
      const { data: readingLogs } = await supabase
        .from('reading_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('reading_date', today)
        .limit(1);

      // Also check reading_sessions table
      const { data: readingSessions } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1);

      // If no reading activity found, send reminder
      if ((!readingLogs || readingLogs.length === 0) && (!readingSessions || readingSessions.length === 0)) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: user.id,
            type: 'reading_reminder',
            title: 'Reading Reminder 📚',
            body: 'Haven\'t read today? Take a few minutes to read!',
            url: '/protected/readapp'
          })
        });

        notificationsSent++;
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Reading reminder cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
