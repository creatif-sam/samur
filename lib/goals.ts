import type { Goal } from '@/lib/types'
import { parseDateKey, toLocalDateKey } from '@/lib/dates'

export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

// Due dates are plain YYYY-MM-DD; read them as local dates (new Date() would treat them as UTC)
export function dueDate(goal: Pick<Goal, 'due_date'>) {
  return goal.due_date ? parseDateKey(goal.due_date) : null
}

export function isOverdue(goal: Pick<Goal, 'due_date' | 'status'>, todayKey = toLocalDateKey(new Date())) {
  return !!goal.due_date && goal.status !== 'done' && goal.due_date.slice(0, 10) < todayKey
}

export function inPeriod(date: Date, period: GoalPeriod, now = new Date()) {
  switch (period) {
    case 'weekly': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      return date >= start && date < end
    }
    case 'monthly':
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    case 'quarterly':
      return Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3) && date.getFullYear() === now.getFullYear()
    case 'yearly':
      return date.getFullYear() === now.getFullYear()
  }
}

// Overdue first, then soonest due, undated after dated, done last
export function sortGoals<T extends Pick<Goal, 'due_date' | 'status' | 'created_at'>>(goals: T[], todayKey = toLocalDateKey(new Date())) {
  const rank = (g: T) => (g.status === 'done' ? 2 : isOverdue(g, todayKey) ? 0 : 1)
  return [...goals].sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    const da = a.due_date?.slice(0, 10) ?? '9999-12-31'
    const db = b.due_date?.slice(0, 10) ?? '9999-12-31'
    return da.localeCompare(db) || (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

// Status that matches a progress value, keeping "blocked" until the goal is finished
export function statusForProgress(progress: number, current: Goal['status']): Goal['status'] {
  if (progress >= 100) return 'done'
  if (current === 'blocked') return 'blocked'
  return progress > 0 ? 'doing' : 'to_do'
}
