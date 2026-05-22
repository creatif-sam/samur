import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  // Calculate the window (9 to 11 minutes from now)
  const now = new Date();
  const startTime = new Date(now.getTime() + 9 * 60000).toISOString();
  const endTime = new Date(now.getTime() + 11 * 60000).toISOString();

  // 1. Find upcoming tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('reminder_sent', false)
    .gte('start_time', startTime)
    .lte('start_time', endTime);

  if (!tasks || tasks.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // 2. Loop through and send
  for (const task of tasks) {
    await fetch('https://mastery.samuelgyasi.com/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: task.user_id,
        title: "Upcoming Task ⏳",
        body: `"${task.title}" starts in 10 minutes!`,
        url: "/protected/planner"
      })
    });

    // 3. Mark as sent
    await supabase.from('tasks').update({ reminder_sent: true }).eq('id', task.id);
  }

  return NextResponse.json({ ok: true, sent: tasks.length });
}