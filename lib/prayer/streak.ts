// prayer_sessions.date holds the user's local day as YYYY-MM-DD

export const toISO = (d: Date) => d.toLocaleDateString('en-CA')

export function parseISODate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftISO(key: string, days: number) {
  const d = parseISODate(key)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

// Consecutive prayer days ending exactly on `day`
export function streakEndingOn(days: Set<string>, day: string) {
  let streak = 0
  let cursor = day
  while (days.has(cursor)) {
    streak++
    cursor = shiftISO(cursor, -1)
  }
  return streak
}

// Current streak; today itself may still be in progress, so an empty today
// doesn't break it.
export function streakFrom(days: Set<string>, today = toISO(new Date())) {
  return streakEndingOn(days, days.has(today) ? today : shiftISO(today, -1))
}

export function intersect(a: Set<string>, b: Set<string>) {
  return new Set([...a].filter(d => b.has(d)))
}
