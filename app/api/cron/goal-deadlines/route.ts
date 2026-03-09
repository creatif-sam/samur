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
    
    // Calculate dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
    const oneWeekStr = oneWeekFromNow.toISOString().split('T')[0];

    let notificationsSent = 0;

    // 1. Check goals with approaching deadlines
    const { data: goals } = await serviceSupabase
      .from('goals')
      .select('*, owner:owner_id(id, name)')
      .not('due_date', 'is', null)
      .eq('status', 'active')
      .or(`due_date.eq.${tomorrowStr},due_date.eq.${threeDaysStr},due_date.eq.${oneWeekStr}`);

    if (goals && goals.length > 0) {
      for (const goal of goals) {
        const dueDate = new Date(goal.due_date);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let message = '';
        if (daysLeft === 1) {
          message = `Goal "${goal.title}" is due tomorrow!`;
        } else if (daysLeft === 3) {
          message = `Goal "${goal.title}" is due in 3 days`;
        } else if (daysLeft === 7) {
          message = `Goal "${goal.title}" is due in 1 week`;
        }

        if (message && goal.owner_id) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications/send-internal`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cronSecret}`
            },
            body: JSON.stringify({
              targetUserId: goal.owner_id,
              type: 'goal_deadline',
              title: 'Goal Deadline Approaching ⏰',
              body: message,
              url: '/protected/goals'
            })
          });
          notificationsSent++;
        }
      }
    }

    // 2. Check visions with approaching target dates
    const { data: visions } = await serviceSupabase
      .from('visions')
      .select('*, owner:owner_id(id, name)')
      .not('target_date', 'is', null)
      .or(`target_date.eq.${tomorrowStr},target_date.eq.${threeDaysStr},target_date.eq.${oneWeekStr}`);

    if (visions && visions.length > 0) {
      for (const vision of visions) {
        const targetDate = new Date(vision.target_date);
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let message = '';
        if (daysLeft === 1) {
          message = `Vision "${vision.title}" target date is tomorrow!`;
        } else if (daysLeft === 3) {
          message = `Vision "${vision.title}" target date in 3 days`;
        } else if (daysLeft === 7) {
          message = `Vision "${vision.title}" target date in 1 week`;
        }

        if (message && vision.owner_id) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications/send-internal`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cronSecret}`
            },
            body: JSON.stringify({
              targetUserId: vision.owner_id,
              type: 'goal_deadline',
              title: 'Vision Target Approaching 🎯',
              body: message,
              url: '/protected/goals'
            })
          });
          notificationsSent++;
        }
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Goal deadline cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
