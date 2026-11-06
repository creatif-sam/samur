import { addDays, daysBetween, parseDateKey, toLocalDateKey } from '@/lib/dates'

// Helpers for the New Goal and New Vision forms. Nothing here blocks anyone:
// the forms only guide, and every nudge is a rule of thumb, not a requirement.

// ── Quick due dates for a goal ──

const endOfMonth = (key: string) => {
  const d = parseDateKey(key)
  return toLocalDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
const endOfQuarter = (key: string) => {
  const d = parseDateKey(key)
  return toLocalDateKey(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0))
}

// Near dates first. A preset that lands on the same day as an earlier one is dropped.
export function goalDatePresets(today: string): { label: string; value: string }[] {
  const year = parseDateKey(today).getFullYear()
  const all = [
    { label: 'End of this month', value: endOfMonth(today) },
    { label: 'In 30 days', value: addDays(today, 30) },
    { label: 'End of this quarter', value: endOfQuarter(today) },
    { label: `End of ${year}`, value: `${year}-12-31` },
  ]
  const seen = new Set<string>()
  return all.filter(p => {
    if (p.value < today || seen.has(p.value)) return false
    seen.add(p.value)
    return true
  })
}

// Goals work best with a date inside the next few months. Beyond a year it is
// probably a vision, so the form says so gently.
export const FAR_AWAY_DAYS = 365
export const isFarAway = (dueKey: string, today: string) => !!dueKey && daysBetween(today, dueKey) > FAR_AWAY_DAYS

// ── The first goal inside a new vision ──

export const FIRST_GOAL_HORIZONS = [30, 60, 90] as const
export type FirstGoalHorizon = (typeof FIRST_GOAL_HORIZONS)[number]

// The date the user sees on the chip, never one they did not choose: N days out,
// or the vision's own target date when that comes sooner.
export function firstGoalDue(horizon: number, today: string, visionTarget?: string | null) {
  const due = addDays(today, horizon)
  const target = visionTarget ? visionTarget.slice(0, 10) : ''
  return target && target >= today && target < due ? target : due
}

// ── One place for who owns a new goal, so the two forms cannot drift apart ──

// Same rules the New Goal form always used: the toggle decides the type and visibility,
// and the partner is recorded when there is one.
export function newGoalOwnership(opts: { ownerId: string; shared?: boolean; partnerId?: string | null }) {
  const shared = !!opts.shared
  return {
    owner_id: opts.ownerId,
    goal_type: shared ? ('combined' as const) : ('single' as const),
    visibility: shared ? ('shared' as const) : ('private' as const),
    partner_id: opts.partnerId ?? null,
  }
}
