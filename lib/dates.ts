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

// Minutes the zone is ahead of UTC at `instant` (e.g. +60 for Europe/Paris in winter)
function zoneOffsetMinutes(timeZone: string, instant: number) {
  const { dateKey, minutes } = zonedNow(timeZone, new Date(instant))
  const [y, m, d] = dateKey.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d) + minutes * 60_000
  return Math.round((wall - Math.floor(instant / 60_000) * 60_000) / 60_000)
}

// UTC instants bounding a local day in `timeZone`, for filtering timestamptz columns
export function zonedDayRange(timeZone: string | undefined, dateKey: string) {
  const tz = timeZone || 'UTC'
  const [y, m, d] = dateKey.split('-').map(Number)
  const localMidnight = (year: number, month: number, day: number) => {
    const guess = Date.UTC(year, month - 1, day)
    // Second pass corrects for a DST change between the guess and the real instant
    const first = guess - zoneOffsetMinutes(tz, guess) * 60_000
    return guess - zoneOffsetMinutes(tz, first) * 60_000
  }
  return {
    start: new Date(localMidnight(y, m, d)).toISOString(),
    end: new Date(localMidnight(y, m, d + 1)).toISOString(),
  }
}

// Whole days from `fromKey` to `toKey` (negative if `toKey` is earlier)
export function daysBetween(fromKey: string, toKey: string) {
  const [y1, m1, d1] = fromKey.slice(0, 10).split('-').map(Number)
  const [y2, m2, d2] = toKey.slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}
