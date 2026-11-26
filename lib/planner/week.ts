import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays } from '@/lib/dates'
import { buildDayTasks, type PlannerDayRow, type PlannerTask } from '@/lib/planner/tasks'
import { fetchRecurringRows } from '@/lib/planner/queries'

// A week of planner days (Sunday to Saturday, the same weeks as Compass and the big rocks)

export interface WeekDay {
  day: string
  tasks: PlannerTask[]
  completed: string[]
}

export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

// One ranged query for the week, plus the recurring series once
export async function loadWeek(supabase: SupabaseClient, userId: string, start: string, partnerId?: string | null): Promise<WeekDay[]> {
  const ids = partnerId ? [userId, partnerId] : [userId]
  const end = addDays(start, 6)
  const [{ data, error }, recurringRows] = await Promise.all([
    supabase.from('planner_days').select('day, user_id, tasks, completed_task_ids').in('user_id', ids).gte('day', start).lte('day', end),
    fetchRecurringRows(supabase, ids, end),
  ])
  if (error) throw error
  const rows = (data ?? []) as (PlannerDayRow & { completed_task_ids?: string[] | null })[]
  return weekDays(start).map(day => {
    const dayRows = rows.filter(r => r.day === day)
    const own = dayRows.find(r => r.user_id === userId)
    return { day, tasks: buildDayTasks({ dateKey: day, userId, dayRows, recurringRows }), completed: own?.completed_task_ids ?? [] }
  })
}

// Big rocks with no time booked yet this week (and not already done)
export function unscheduledRocks<R extends { id: string; done: boolean }>(rocks: R[], weekTasks: Pick<PlannerTask, 'rock_id'>[]) {
  const booked = new Set(weekTasks.map(t => t.rock_id).filter(Boolean))
  return rocks.filter(r => !r.done && !booked.has(r.id))
}
