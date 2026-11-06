import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { currentStreak } from '@/lib/habits'

// Work sessions in the Library's Create tab. The saved shape is unchanged:
// times are 'HH:MM', hours_worked is the real duration, work_date is the day the session started.

export type WorkType = 'creation' | 'production' | 'reproduction'

export const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'creation', label: 'Creation' },
  { id: 'production', label: 'Production' },
  { id: 'reproduction', label: 'Repetition' },
]

export const TYPE_LABEL: Record<string, string> = Object.fromEntries(WORK_TYPES.map(t => [t.id, t.label]))

export interface CreativeLog {
  id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  hours_worked: number
  worked_on: string
  produced: string | null
  aligned: boolean | null
  focused: boolean | null
  work_type: string
  notes: string | null
}

// ── Durations ──

export const hhmm = (value: string | null | undefined) => (value ? value.slice(0, 5) : '')

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Minutes from start to end on a 24-hour clock. An end before the start means the session
// ran past midnight. Identical times are not a session.
export function minutesBetween(start: string, end: string): number | null {
  if (!/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) return null
  const diff = toMinutes(end) - toMinutes(start)
  if (diff === 0) return null
  return diff > 0 ? diff : diff + 24 * 60
}

export const hoursFromMinutes = (minutes: number) => Number((minutes / 60).toFixed(2))

// 45m · 1h · 1h 30m
export function formatDuration(hours: number) {
  const total = Math.round(hours * 60)
  if (total < 60) return `${total}m`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export const timeOf = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

// A session that ended "now" and lasted `minutes`: its start day, start time and end time
export function endedNow(minutes: number, now = new Date()) {
  const started = new Date(now.getTime() - minutes * 60_000)
  return { date: toLocalDateKey(started), start: timeOf(started), end: timeOf(now) }
}

// ── The running timer (kept on this device) ──

export interface RunningTimer {
  startedAt: number // epoch ms
  activity: string
}

const TIMER_KEY = 'create-session-timer'

export function loadTimer(): RunningTimer | null {
  try {
    const raw = JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null')
    if (raw && typeof raw.startedAt === 'number' && raw.startedAt > 0 && raw.startedAt <= Date.now() + 60_000) {
      return { startedAt: raw.startedAt, activity: typeof raw.activity === 'string' ? raw.activity : '' }
    }
  } catch {}
  return null
}
export function saveTimer(t: RunningTimer) {
  try { localStorage.setItem(TIMER_KEY, JSON.stringify(t)) } catch {}
}
export function clearTimer() {
  try { localStorage.removeItem(TIMER_KEY) } catch {}
}

// What a stopped timer becomes: the start day, the clock times and the real duration
export function timerResult(startedAt: number, endedAt: number) {
  const start = new Date(startedAt)
  const end = new Date(endedAt)
  return {
    date: toLocalDateKey(start),
    start: timeOf(start),
    end: timeOf(end),
    minutes: Math.max(0, Math.round((endedAt - startedAt) / 60_000)),
  }
}

export function formatElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ── Lists and stats ──

// Newest day first, then latest start within a day
export function sortLogs(logs: CreativeLog[]) {
  return [...logs].sort(
    (a, b) =>
      b.work_date.localeCompare(a.work_date) ||
      hhmm(b.start_time).localeCompare(hhmm(a.start_time)) ||
      b.id.localeCompare(a.id),
  )
}

export function groupByDay(logs: CreativeLog[]) {
  const out: { day: string; logs: CreativeLog[]; hours: number }[] = []
  for (const log of sortLogs(logs)) {
    const day = log.work_date.slice(0, 10)
    const last = out[out.length - 1]
    if (last && last.day === day) {
      last.logs.push(log)
      last.hours += log.hours_worked || 0
    } else {
      out.push({ day, logs: [log], hours: log.hours_worked || 0 })
    }
  }
  return out
}

// Recent distinct activities, most recent first, for one-tap reuse
export function recentActivities(logs: CreativeLog[], limit = 6) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const log of sortLogs(logs)) {
    const name = log.worked_on.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= limit) break
  }
  return out
}

export function dayLabel(dayKey: string, todayKey: string) {
  if (dayKey === todayKey) return 'Today'
  if (dayKey === addDays(todayKey, -1)) return 'Yesterday'
  const d = parseDateKey(dayKey)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: d.getFullYear() === parseDateKey(todayKey).getFullYear() ? undefined : 'numeric',
  })
}

// The Sunday that starts the week containing `dayKey` (the same weeks the Goals page uses)
export function weekStartKey(dayKey: string) {
  return addDays(dayKey, -parseDateKey(dayKey).getDay())
}

export interface WeekStats {
  hours: number
  sessions: number
  focusedPct: number | null
  streak: number
  days: { day: string; hours: number; future: boolean; today: boolean }[]
  // Hours in the same stretch of last week (Sunday up to the same weekday), for a fair comparison
  prevHours: number
}

export function weekStats(logs: CreativeLog[], todayKey: string): WeekStats {
  const start = weekStartKey(todayKey)
  const prevStart = addDays(start, -7)
  const offset = parseDateKey(todayKey).getDay() // how far into the week today is

  const hoursByDay = new Map<string, number>()
  const sessionDays = new Set<string>()
  for (const l of logs) {
    const day = l.work_date.slice(0, 10)
    hoursByDay.set(day, (hoursByDay.get(day) ?? 0) + (l.hours_worked || 0))
    sessionDays.add(day)
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i)
    return { day, hours: hoursByDay.get(day) ?? 0, future: day > todayKey, today: day === todayKey }
  })
  const thisWeek = logs.filter(l => l.work_date.slice(0, 10) >= start && l.work_date.slice(0, 10) <= todayKey)
  const rated = thisWeek.filter(l => l.focused !== null)

  let prev = 0
  for (let i = 0; i <= offset; i++) prev += hoursByDay.get(addDays(prevStart, i)) ?? 0

  return {
    hours: Number(days.reduce((a, d) => a + d.hours, 0).toFixed(2)),
    sessions: thisWeek.length,
    focusedPct: rated.length ? Math.round((rated.filter(l => l.focused).length / rated.length) * 100) : null,
    streak: currentStreak(sessionDays, todayKey),
    days,
    prevHours: Number(prev.toFixed(2)),
  }
}
