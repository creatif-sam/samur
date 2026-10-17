import type { SupabaseClient } from '@supabase/supabase-js'
import { RECURRING_ROWS_FILTER, type PlannerDayRow } from './tasks'

// Rows (up to and including `upToDay`) that may hold recurring tasks for these users
export async function fetchRecurringRows(
  supabase: SupabaseClient,
  userIds: string[],
  upToDay: string,
): Promise<PlannerDayRow[]> {
  const base = () =>
    supabase
      .from('planner_days')
      .select('day, user_id, tasks')
      .in('user_id', userIds)
      .lte('day', upToDay)

  const { data, error } = await base().filter('tasks', 'cs', RECURRING_ROWS_FILTER)
  if (!error) return (data ?? []) as PlannerDayRow[]

  // Containment needs a jsonb column; fall back to scanning every row
  const fallback = await base().not('tasks', 'is', null)
  if (fallback.error) throw fallback.error
  return ((fallback.data ?? []) as PlannerDayRow[]).filter(
    r => Array.isArray(r.tasks) && r.tasks.some(t => t?.recurring),
  )
}

export async function fetchDayRows(supabase: SupabaseClient, userIds: string[], day: string) {
  const { data, error } = await supabase
    .from('planner_days')
    .select('day, user_id, tasks, completed_task_ids, morning, reflection, mood')
    .in('user_id', userIds)
    .eq('day', day)
  if (error) throw error
  return (data ?? []) as (PlannerDayRow & { morning?: string | null; reflection?: string | null; mood?: string | null })[]
}
