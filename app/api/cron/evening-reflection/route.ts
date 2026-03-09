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

    // For each user, check if they have written an evening reflection today
    for (const user of users.users) {
      // Check if user has an evening reflection for today in planner_days table
      const { data: plannerDay } = await supabase
        .from('planner_days')
        .select('reflection')
        .eq('user_id', user.id)
        .eq('day', today)
        .single();

      // If no reflection found or reflection is empty, send reminder
      if (!plannerDay || !plannerDay.reflection || plannerDay.reflection.trim() === '') {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
