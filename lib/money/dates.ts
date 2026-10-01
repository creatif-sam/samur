// money_entries.entry_date and budget period keys are plain `YYYY-MM-DD` dates.
// Build and parse them in local time; toISOString() would shift them to UTC
// and land on the wrong day for anyone not at UTC+0.

export function toLocalDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

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
