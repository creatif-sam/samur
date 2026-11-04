import { daysBetween, toLocalDateKey } from '@/lib/dates'

export type VisionPace = 'achieved' | 'overdue' | 'ahead' | 'on_track' | 'behind' | 'open'

type GoalLike = { status?: string | null; progress?: number | null }

// A finished goal counts as 100% even if its progress number wasn't updated
export function visionProgress(goals: GoalLike[]) {
  if (goals.length === 0) return 0
  const total = goals.reduce((sum, g) => sum + (g.status === 'done' ? 100 : Math.min(100, Math.max(0, g.progress ?? 0))), 0)
  return Math.round(total / goals.length)
}

// Where you should be by today if progress were spread evenly from the day
// the vision was cast to its target date, compared with where you are.
export function visionPace(
  progress: number,
  createdAt: string | null | undefined,
  targetDate: string | null | undefined,
  todayKey = toLocalDateKey(new Date()),
): { pace: VisionPace; expected: number | null; daysLeft: number | null } {
  if (progress >= 100) return { pace: 'achieved', expected: 100, daysLeft: targetDate ? daysBetween(todayKey, targetDate.slice(0, 10)) : null }
  if (!targetDate) return { pace: 'open', expected: null, daysLeft: null }

  const end = targetDate.slice(0, 10)
  const daysLeft = daysBetween(todayKey, end)
  if (daysLeft < 0) return { pace: 'overdue', expected: 100, daysLeft }

  const start = createdAt ? toLocalDateKey(new Date(createdAt)) : todayKey
  const span = Math.max(1, daysBetween(start, end))
  const elapsed = Math.min(span, Math.max(0, daysBetween(start, todayKey)))
  const expected = Math.round((elapsed / span) * 100)
  const diff = progress - expected
  const pace: VisionPace = diff >= 10 ? 'ahead' : diff >= -10 ? 'on_track' : 'behind'
  return { pace, expected, daysLeft }
}

export const PACE_LABEL: Record<VisionPace, string> = {
  achieved: 'Achieved',
  overdue: 'Past target',
  ahead: 'Ahead',
  on_track: 'On track',
  behind: 'Behind',
  open: 'Open-ended',
}

export const PACE_STYLE: Record<VisionPace, string> = {
  achieved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  ahead: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  on_track: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  behind: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  open: 'bg-muted text-muted-foreground',
}

export function daysLeftLabel(daysLeft: number | null) {
  if (daysLeft === null) return null
  if (daysLeft < 0) return `${-daysLeft} day${daysLeft === -1 ? '' : 's'} past`
  if (daysLeft === 0) return 'Due today'
  if (daysLeft < 60) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
  const months = Math.round(daysLeft / 30.4)
  return `${months} month${months === 1 ? '' : 's'} left`
}

// Vision colours are user-picked hex values; these keep text on them readable
function parseHex(hex: string) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(full, 16)
  return Number.isNaN(n) ? [124, 58, 237] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Mix a colour toward black (amount 0–1) so white text sits on it comfortably
export function deepen(hex: string, amount = 0.35) {
  const [r, g, b] = parseHex(hex).map(c => Math.round(c * (1 - amount)))
  return `rgb(${r}, ${g}, ${b})`
}

// A darkened colour with enough contrast for white text (WCAG AA for bold text)
export function solidFor(hex: string) {
  const lum = (rgb: number[]) => {
    const [r, g, b] = rgb.map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const base = parseHex(hex)
  for (let amt = 0; amt <= 0.7; amt += 0.05) {
    const rgb = base.map(c => Math.round(c * (1 - amt)))
    if (1.05 / (lum(rgb) + 0.05) >= 3.6) return `rgb(${rgb.join(', ')})`
  }
  return deepen(hex, 0.7)
}

// Gradient for a vision's hero header
export function visionGradient(hex: string) {
  return `linear-gradient(135deg, ${solidFor(hex)} 0%, ${deepen(hex, 0.6)} 100%)`
}

// How far through the calendar year today is (0–100)
export function yearElapsed(now = new Date()) {
  const y = now.getFullYear()
  const start = `${y}-01-01`
  const total = daysBetween(start, `${y + 1}-01-01`)
  return { year: y, pct: Math.round((daysBetween(start, toLocalDateKey(now)) / total) * 100), daysLeft: daysBetween(toLocalDateKey(now), `${y}-12-31`) }
}
