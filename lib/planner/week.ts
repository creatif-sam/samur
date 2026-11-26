import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays } from '@/lib/dates'
import { buildDayTasks, freeGaps, overlapping, type PlannerDayRow, type PlannerTask } from '@/lib/planner/tasks'
import { fetchRecurringRows } from '@/lib/planner/queries'

// A week of planner days (Sunday to Saturday, the same weeks as Compass and the big rocks)

export interface WeekDay {
  day: string
  tasks: PlannerTask[]       // yours, plus your partner's shared ones when a partner was asked for
  completed: string[]        // the ids you ticked that day
  partnerCompleted?: string[]
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
    const partner = partnerId ? dayRows.find(r => r.user_id === partnerId) : undefined
    return {
      day,
      tasks: buildDayTasks({ dateKey: day, userId, dayRows, recurringRows }),
      completed: own?.completed_task_ids ?? [],
      ...(partnerId ? { partnerCompleted: partner?.completed_task_ids ?? [] } : {}),
    }
  })
}

// ── Big rocks done in sessions ──
// A rock can need several sessions in the week ("Run three times"). Each event booked
// for it is a session; ticking the event done counts it. Without a target, one session.

export const rockTarget = (rock: { target?: number | null }) => Math.max(1, Math.round(rock.target ?? 1))

export type RockProgress = Record<string, { booked: number; done: number }>

export function rockProgress(days: Pick<WeekDay, 'tasks' | 'completed'>[], userId: string | null): RockProgress {
  const progress: RockProgress = {}
  for (const d of days) {
    for (const t of d.tasks) {
      if (!t.rock_id || (t.owner_id && t.owner_id !== userId)) continue
      const p = (progress[t.rock_id] ??= { booked: 0, done: 0 })
      p.booked++
      if (d.completed.includes(t.id)) p.done++
    }
  }
  return progress
}

// Big rocks that still need time this week: not done, and fewer sessions booked than the target
export function unscheduledRocks<R extends { id: string; done: boolean; target?: number | null }>(rocks: R[], progress: RockProgress) {
  return rocks.filter(r => !r.done && (progress[r.id]?.booked ?? 0) < rockTarget(r))
}

// After ticking or unticking a session: should the rock now be done (or open again)?
export function rockShouldBeDone(rock: { id: string; target?: number | null }, progress: RockProgress) {
  return (progress[rock.id]?.done ?? 0) >= rockTarget(rock)
}

// ── A day's load: clashes and no room left ──
export function dayLoad(tasks: PlannerTask[], from = 8 * 60, to = 22 * 60) {
  let clashes = 0
  tasks.forEach((t, i) => { clashes += overlapping(t, tasks.slice(i + 1)).length })
  const full = tasks.length > 0 && freeGaps(tasks, from, to, 30).length === 0
  return { clashes, full }
}
