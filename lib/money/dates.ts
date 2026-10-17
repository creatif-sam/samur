export { toLocalDateKey, parseDateKey } from '@/lib/dates'

// Next year first (for planning ahead), then the four years before this one
export function yearOptions(now = new Date()) {
  return Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i)
}

// Sunday-based week, shifted by `offset` weeks from the current one
export function weekStart(offset: number, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset * 7)
}

export function formatWeekRange(offset: number, template: string) {
  const start = weekStart(offset)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  return template
    .replace('{start}', start.toLocaleDateString(undefined, opts))
    .replace('{end}', end.toLocaleDateString(undefined, opts))
}
