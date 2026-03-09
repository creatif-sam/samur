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

    // For each user, check if they have written an evening reflection today
    for (const user of users) {
      // Check if user has an evening reflection for today in planner_days table
      const { data: plannerDay } = await serviceSupabase
        .from('planner_days')
        .select('reflection')
        .eq('user_id', user.id)
        .eq('day', today)
        .single();

      // If no reflection found or reflection is empty, send reminder
      if (!plannerDay || !plannerDay.reflection || plannerDay.reflection.trim() === '') {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications/send-internal`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`
          },
          body: JSON.stringify({
            targetUserId: user.id,
            type: 'planner_reminder',
            title: 'Evening Reflection 🌙',
            body: 'Don\'t forget to write your evening reflection!',
            url: '/protected/planner'
          })
        });

        notificationsSent++;
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Evening reflection cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
