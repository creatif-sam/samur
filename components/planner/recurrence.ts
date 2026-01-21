import type { PlannerTask } from './DailyPlanner'

export function parseMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function shouldRepeatOnDate(
  task: PlannerTask,
  date: Date
) {
  if (!task.recurring) return false

  if (task.recurring.until) {
    const until = new Date(task.recurring.until)
    if (date > until) return false
  }

  if (task.recurring.unit === 'day') {
    return true
  }

  if (task.recurring.unit === 'week') {
    return task.recurring.daysOfWeek.includes(date.getDay())
  }

  return false
}

export function materializeRecurringTask(
  task: PlannerTask,
  date: Date
): PlannerTask {
  return {
    ...task,
    id: crypto.randomUUID(),
    completed: false,
    recurring: undefined, // important
  }
}
