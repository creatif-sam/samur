// Shared planner logic, used by the planner UI and the cron routes.
//
// Tasks live as JSON in `planner_days.tasks`. A recurring task is stored once,
// in the row of the day it was created (`source_day`); occurrences on other
// days are computed from its rule. Older versions of the app also copied
// recurring tasks into every day row the user touched — those stale copies are
// ignored when building a day.

import { addDays, parseDateKey } from '@/lib/dates'

export interface PlannerRecurrence {
  interval: number
  unit: 'day' | 'week' | 'month'
  daysOfWeek: number[]
  until?: string
  exceptions?: string[] // Day keys where this occurrence was deleted or detached
}

export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
  vision_id?: string
  visibility?: 'private' | 'shared'
  owner_id?: string
  source_day?: string // The day this recurring task was originally created
  recurring?: PlannerRecurrence
}

export interface PlannerDayRow {
  day: string
  user_id: string
  tasks: PlannerTask[] | null
  completed_task_ids?: string[] | null
}

// Postgres jsonb containment filter matching rows that hold at least one recurring task
export const RECURRING_ROWS_FILTER = JSON.stringify([{ recurring: {} }])

// ---------- time ----------

export function parseMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

// End may be past midnight (e.g. 23:00 → 01:00); it is then pushed to the next day
export function taskSpan(task: Pick<PlannerTask, 'start' | 'end'>) {
  const start = parseMinutes(task.start)
  let end = parseMinutes(task.end)
  if (end <= start) end += 1440
  return { start, end }
}

export function taskDuration(task: Pick<PlannerTask, 'start' | 'end'>) {
  const { start, end } = taskSpan(task)
  return end - start
}

export function endsNextDay(task: Pick<PlannerTask, 'start' | 'end'>) {
  return parseMinutes(task.end) <= parseMinutes(task.start)
}

// Minutes covered by the tasks inside [windowStart, windowEnd), overlaps counted once
export function busyMinutes(tasks: Pick<PlannerTask, 'start' | 'end'>[], windowStart = 0, windowEnd = 1440) {
  const spans = tasks
    .map(taskSpan)
    .map(s => ({ start: Math.max(s.start, windowStart), end: Math.min(s.end, windowEnd) }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start)

  let total = 0
  let curStart = -1
  let curEnd = -1
  for (const s of spans) {
    if (s.start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart
      curStart = s.start
      curEnd = s.end
    } else {
      curEnd = Math.max(curEnd, s.end)
    }
  }
  if (curEnd > curStart) total += curEnd - curStart
  return total
}

export function overlapping(task: Pick<PlannerTask, 'id' | 'start' | 'end'>, others: PlannerTask[]) {
  const a = taskSpan(task)
  return others.filter(o => {
    if (o.id === task.id) return false
    const b = taskSpan(o)
    return a.start < b.end && b.start < a.end
  })
}

export function sortByStart<T extends Pick<PlannerTask, 'start'>>(tasks: T[]) {
  return [...tasks].sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
}

// ---------- recurrence ----------

function dayNumber(key: string) {
  const d = parseDateKey(key)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}

export function occursOn(rule: PlannerRecurrence, sourceDay: string, dateKey: string) {
  if (dateKey < sourceDay) return false
  if (rule.until && dateKey > rule.until) return false
  if (rule.exceptions?.includes(dateKey)) return false

  const interval = Math.max(1, Math.floor(rule.interval) || 1)
  const source = parseDateKey(sourceDay)
  const date = parseDateKey(dateKey)

  if (rule.unit === 'day') {
    return (dayNumber(dateKey) - dayNumber(sourceDay)) % interval === 0
  }

  if (rule.unit === 'week') {
    const days = rule.daysOfWeek?.length ? rule.daysOfWeek : [source.getDay()]
    if (!days.includes(date.getDay())) return false
    // Compare the Sundays that start each week
    const weeks = Math.round(
      ((dayNumber(dateKey) - date.getDay()) - (dayNumber(sourceDay) - source.getDay())) / 7,
    )
    return weeks % interval === 0
  }

  if (rule.unit === 'month') {
    const months = (date.getFullYear() - source.getFullYear()) * 12 + (date.getMonth() - source.getMonth())
    if (months % interval !== 0) return false
    // A task created on the 31st lands on the last day of shorter months
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return date.getDate() === Math.min(source.getDate(), lastDay)
  }

  return false
}

export interface RecurringSeries {
  task: PlannerTask
  sourceDay: string
  ownerId: string
}

// One entry per recurring task id. The authoritative copy is the one stored in
// its source day's row; legacy copies elsewhere are only used to find that day.
export function collectRecurring(rows: PlannerDayRow[]) {
  const series = new Map<string, RecurringSeries>()
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day))

  for (const row of sorted) {
    if (!Array.isArray(row.tasks)) continue
    for (const t of row.tasks) {
      if (!t?.recurring) continue
      const existing = series.get(t.id)
      const sourceDay = existing?.sourceDay ?? t.source_day ?? row.day
      // First sighting registers the series; the copy in the source row wins
      if (!existing || row.day === sourceDay) {
        const ownerId = t.owner_id || row.user_id
        series.set(t.id, { task: { ...t, source_day: sourceDay, owner_id: ownerId }, sourceDay, ownerId })
      }
    }
  }
  return series
}

// The tasks a user should see on `dateKey`: their own one-off tasks, shared
// one-off tasks of the partner, and every recurring occurrence they can see.
export function buildDayTasks({
  dateKey,
  userId,
  dayRows,
  recurringRows,
}: {
  dateKey: string
  userId: string
  dayRows: PlannerDayRow[]
  recurringRows: PlannerDayRow[]
}) {
  const series = collectRecurring([...recurringRows, ...dayRows])
  const result = new Map<string, PlannerTask>()
  const visible = (owner: string, t: PlannerTask) => owner === userId || t.visibility === 'shared'

  for (const row of dayRows) {
    if (row.day !== dateKey || !Array.isArray(row.tasks)) continue
    for (const raw of row.tasks) {
      if (!raw?.id || raw.recurring) continue // recurring ones come from their series
      const t: PlannerTask = { ...raw, owner_id: raw.owner_id || row.user_id, visibility: raw.visibility ?? 'private' }
      if (visible(t.owner_id!, t)) result.set(t.id, t)
    }
  }

  for (const { task, sourceDay, ownerId } of series.values()) {
    if (result.has(task.id)) continue
    const t: PlannerTask = { ...task, visibility: task.visibility ?? 'private' }
    if (visible(ownerId, t) && occursOn(task.recurring!, sourceDay, dateKey)) result.set(t.id, t)
  }

  return Array.from(result.values())
}

// Tasks to persist in the user's row for `dateKey`: their own one-off tasks plus
// recurring tasks whose series starts on this day.
export function tasksToStore(tasks: PlannerTask[], userId: string, dateKey: string) {
  return tasks.filter(t =>
    (!t.owner_id || t.owner_id === userId) &&
    (!t.recurring || (t.source_day ?? dateKey) === dateKey),
  )
}

// One user's tasks for every day in [from, to], recurring occurrences included,
// with `completed` filled in from each day's completed_task_ids.
export function expandDays({
  userId,
  rows,
  recurringRows,
  from,
  to,
}: {
  userId: string
  rows: PlannerDayRow[]
  recurringRows: PlannerDayRow[]
  from: string
  to: string
}) {
  const byDay = new Map(rows.map(r => [r.day, r]))
  const days: { day: string; tasks: PlannerTask[] }[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const row = byDay.get(day)
    const done = new Set(row?.completed_task_ids ?? [])
    const tasks = buildDayTasks({ dateKey: day, userId, dayRows: row ? [row] : [], recurringRows })
    days.push({ day, tasks: tasks.map(t => ({ ...t, completed: done.has(t.id) })) })
  }
  return days
}
