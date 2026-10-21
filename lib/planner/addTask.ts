import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlannerTask } from './tasks'

// Adds a one-off task to a user's day row (read-modify-write, keeps everything else)
export async function addTaskToDay(supabase: SupabaseClient, userId: string, day: string, task: PlannerTask) {
  const { data, error } = await supabase
    .from('planner_days')
    .select('tasks, completed_task_ids, morning, reflection, mood')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle()
  if (error) throw error

  const { error: upsertError } = await supabase.from('planner_days').upsert({
    day,
    user_id: userId,
    tasks: [...(Array.isArray(data?.tasks) ? data.tasks : []), task],
    completed_task_ids: data?.completed_task_ids ?? [],
    morning: data?.morning ?? '',
    reflection: data?.reflection ?? '',
    mood: data?.mood ?? '',
    visibility: 'private',
  }, { onConflict: 'user_id,day' })
  if (upsertError) throw upsertError
}
