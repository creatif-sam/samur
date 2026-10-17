// Plain `YYYY-MM-DD` date keys (planner days, money entries, budget periods).
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

// Current date key and minutes since midnight in an IANA time zone (falls back to UTC)
export function zonedNow(timeZone: string | undefined, now = new Date()) {
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
  } catch {
    return zonedNow('UTC', now)
  }
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

export function addDays(key: string, days: number) {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toLocalDateKey(d)
}
