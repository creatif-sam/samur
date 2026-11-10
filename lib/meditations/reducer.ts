import { addDays, toLocalDateKey } from '@/lib/dates'

// lib/meditations/reducer.ts
type Period = 'morning' | 'evening'

interface ReducedDay {
  morning: boolean
  evening: boolean
  morningVisibility?: 'private' | 'shared'
  eveningVisibility?: 'private' | 'shared'
}

export function reduceMeditations(meditations: any[]) {
  const byUser: Record<string, Record<string, ReducedDay>> = {}

  meditations.forEach((m) => {
    if (!m?.author_id || !m.created_at) return

    const day = toLocalDateKey(new Date(m.created_at))

    if (!byUser[m.author_id]) byUser[m.author_id] = {}
    if (!byUser[m.author_id][day]) {
      byUser[m.author_id][day] = { morning: false, evening: false }
    }

    if (m.period === 'morning') {
      byUser[m.author_id][day].morning = true
      byUser[m.author_id][day].morningVisibility = m.visibility || 'private'
    }
    if (m.period === 'evening') {
      byUser[m.author_id][day].evening = true
      byUser[m.author_id][day].eveningVisibility = m.visibility || 'private'
    }
  })

  return byUser
}

// Days in a row with a meditation, counting back from today, or from yesterday if today
// isn't done yet (same rule as the streak on your own card)
export function calculateStreak(days: Record<string, unknown>) {
  const today = toLocalDateKey(new Date())
  let cursor = days[today] ? today : addDays(today, -1)
  let streak = 0
  while (days[cursor]) { streak++; cursor = addDays(cursor, -1) }
  return streak
}
