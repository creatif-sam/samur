import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users?.users) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ ok: false, error: 'Failed to fetch users' });
    }

    let notificationsSent = 0;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // For each user, check their tasks for today
    for (const user of users.users) {
      // Fetch today's planner data
      const { data: plannerDay } = await serviceSupabase
        .from('planner_days')
        .select('tasks, completed_task_ids')
        .eq('user_id', user.id)
        .eq('day', today)
        .single();
      
      if (!plannerDay?.tasks || plannerDay.tasks.length === 0) continue;

      const tasks = plannerDay.tasks;
      const completedTaskIds = plannerDay.completed_task_ids || [];

      // Check each task
      for (const task of tasks) {
        // Skip completed tasks
        if (completedTaskIds.includes(task.id)) continue;

        // Parse task start time
        const [taskHours, taskMinutes] = task.start.split(':').map(Number);
        const taskStartMinutes = taskHours * 60 + (taskMinutes || 0);
        
        // Calculate minutes until task starts
        const minutesUntilTask = taskStartMinutes - currentTotalMinutes;

        // Send notification if task starts in 4-6 minutes (accounting for cron timing)
        if (minutesUntilTask >= 4 && minutesUntilTask <= 6) {
          // Check if we've already sent notification for this task today
          const { data: existingNotif } = await serviceSupabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'task_reminder')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`)
            .eq('data->>taskId', task.id)
            .single();

          if (existingNotif) continue; // Already sent notification for this task today

          // Get vision emoji if task has a vision
          let visionEmoji = '⏰';
          if (task.vision_id) {
            const { data: vision } = await serviceSupabase
              .from('visions')
              .select('emoji')
              .eq('id', task.vision_id)
              .single();
            
            if (vision?.emoji) visionEmoji = vision.emoji;
          }

          // Send notification
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: user.id,
              type: 'task_reminder',
              title: `${visionEmoji} Task in 5 minutes`,
              body: `${task.text} starts at ${task.start}`,
              url: '/protected/planner',
              data: { taskId: task.id, taskStart: task.start }
            })
          });

          notificationsSent++;
        }
      }
    }

    return NextResponse.json({ ok: true, sent: notificationsSent });

  } catch (err: any) {
    console.error('Task reminders cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
