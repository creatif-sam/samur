import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, daysBetween, zonedDayRange, zonedNow } from '@/lib/dates'
import { fetchRecurringRows } from '@/lib/planner/queries'
import { expandDays, type PlannerDayRow } from '@/lib/planner/tasks'

// Each added query is optional: if a table or column is missing (a migration not run yet)
// it counts as nothing, and the rest of the email is still sent.
async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const res = await query
    return res.error ? [] : res.data ?? []
  } catch {
    return []
  }
}

export interface RangeStats {
  prayerMinutes: number
  prayerByDay: Record<string, number>
  readingPages: number
  bibleChapters: number
  meditations: number
  tasksDone: number
  totalTasks: number
  reflections: number
  posts: number
  prayersAnswered: number
  versesChosen: number
  versesMemorized: number
  goalsDue: number
  goalsDueDone: number
  // Days with any prayer, Bible, reading, meditation, reflection or finished task
  activeDays: Set<string>
}

export interface GoalLine { title: string; due: string; progress: number }

export interface WeeklyData {
  displayName: string
  weekStart: string
  weekEnd: string
  days: string[]
  current: RangeStats
  previous: RangeStats
  nextWeekGoals: GoalLine[]
  nextWeekGoalCount: number
  overdueGoals: GoalLine[]
  overdueCount: number
  unreadCount: number
}

export type SummaryUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

type Meta = { timeZone: string | undefined }
type DayRow = PlannerDayRow & { reflection?: string | null }

async function collectRange(service: SupabaseClient, userId: string, from: string, to: string, { timeZone }: Meta): Promise<RangeStats> {
  const start = zonedDayRange(timeZone, from).start
  const end = zonedDayRange(timeZone, to).end
  const localDay = (iso: string) => zonedNow(timeZone, new Date(iso)).dateKey

  const [planner, recurring, prayer, readLogs, bible, meditations, posts, answered, verses, goals] = await Promise.all([
    rows<DayRow>(service.from('planner_days').select('day, user_id, tasks, reflection, completed_task_ids').eq('user_id', userId).gte('day', from).lte('day', to)),
    fetchRecurringRows(service, [userId], to).catch(() => [] as PlannerDayRow[]),
    rows<{ date: string; duration_seconds: number | null }>(service.from('prayer_sessions').select('date, duration_seconds').eq('user_id', userId).eq('completed', true).gte('date', from).lte('date', to)),
    rows<{ reading_date: string; pages_read: number | null }>(service.from('reading_logs').select('reading_date, pages_read').eq('user_id', userId).gte('reading_date', from).lte('reading_date', to)),
    rows<{ day: string }>(service.from('bible_reading_log').select('day').eq('user_id', userId).gte('day', from).lte('day', to)),
    rows<{ created_at: string }>(service.from('meditations').select('created_at').eq('author_id', userId).gte('created_at', start).lt('created_at', end)),
    rows<{ id: string }>(service.from('posts').select('id').eq('author_id', userId).gte('created_at', start).lt('created_at', end)),
    rows<{ id: string }>(service.from('posts').select('id').eq('author_id', userId).gte('answered_at', start).lt('answered_at', end)),
    rows<{ memorized: boolean | null }>(service.from('memory_verses').select('memorized').eq('user_id', userId).gte('day', from).lte('day', to)),
    rows<{ status: string }>(service.from('goals').select('status').eq('owner_id', userId).gte('due_date', from).lte('due_date', to)),
  ])

  const expanded = expandDays({ userId, rows: planner, recurringRows: recurring, from, to })
  const tasks = expanded.flatMap(d => d.tasks)

  const prayerByDay: Record<string, number> = {}
  for (const p of prayer) prayerByDay[p.date] = (prayerByDay[p.date] ?? 0) + (p.duration_seconds ?? 0) / 60

  const active = new Set<string>()
  for (const p of prayer) active.add(p.date)
  for (const r of readLogs) active.add(r.reading_date)
  for (const b of bible) active.add(b.day)
  for (const m of meditations) active.add(localDay(m.created_at))
  for (const d of planner) if (typeof d.reflection === 'string' && d.reflection.trim()) active.add(d.day)
  for (const d of expanded) if (d.tasks.some(t => t.completed)) active.add(d.day)

  return {
    prayerMinutes: Math.round(Object.values(prayerByDay).reduce((a, b) => a + b, 0)),
    prayerByDay,
    readingPages: readLogs.reduce((a, r) => a + (r.pages_read ?? 0), 0),
    bibleChapters: bible.length,
    meditations: meditations.length,
    tasksDone: tasks.filter(t => t.completed).length,
    totalTasks: tasks.length,
    reflections: planner.filter(d => typeof d.reflection === 'string' && d.reflection.trim().length > 0).length,
    posts: posts.length,
    prayersAnswered: answered.length,
    versesChosen: verses.length,
    versesMemorized: verses.filter(v => v.memorized).length,
    goalsDue: goals.length,
    goalsDueDone: goals.filter(g => g.status === 'done').length,
    activeDays: active,
  }
}

// The seven days ending yesterday (the email goes out Sunday morning, when today is still empty),
// compared with the seven days before, plus what is coming up.
export async function collectWeeklyData(service: SupabaseClient, user: SummaryUser, now = new Date()): Promise<WeeklyData> {
  const timeZone = user.user_metadata?.timezone as string | undefined
  const today = zonedNow(timeZone, now).dateKey
  const weekEnd = addDays(today, -1)
  const weekStart = addDays(today, -7)
  const meta = { timeZone }

  const [current, previous, nextWeek, overdue, unread] = await Promise.all([
    collectRange(service, user.id, weekStart, weekEnd, meta),
    collectRange(service, user.id, addDays(weekStart, -7), addDays(weekStart, -1), meta),
    rows<{ title: string; due_date: string; progress: number | null }>(
      service.from('goals').select('title, due_date, progress').eq('owner_id', user.id).neq('status', 'done')
        .gte('due_date', today).lte('due_date', addDays(today, 6)).order('due_date', { ascending: true }),
    ),
    rows<{ title: string; due_date: string; progress: number | null }>(
      service.from('goals').select('title, due_date, progress').eq('owner_id', user.id).neq('status', 'done')
        .lt('due_date', today).order('due_date', { ascending: true }),
    ),
    service.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      .then(r => (r.error ? 0 : r.count ?? 0), () => 0),
  ])

  const line = (g: { title: string; due_date: string; progress: number | null }): GoalLine => ({
    title: g.title, due: g.due_date.slice(0, 10), progress: g.progress ?? 0,
  })
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.email ?? 'friend').split('@')[0]

  return {
    displayName: name,
    weekStart,
    weekEnd,
    days: Array.from({ length: daysBetween(weekStart, weekEnd) + 1 }, (_, i) => addDays(weekStart, i)),
    current,
    previous,
    nextWeekGoals: nextWeek.slice(0, 3).map(line),
    nextWeekGoalCount: nextWeek.length,
    overdueGoals: overdue.slice(0, 3).map(line),
    overdueCount: overdue.length,
    unreadCount: unread,
  }
}
