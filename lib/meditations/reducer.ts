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

    const day = new Date(m.created_at).toISOString().slice(0, 10)

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

export function calculateStreak(days: Record<string, ReducedDay>) {
  let streak = 0
  const today = new Date()

  for (let i = 0; ; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = date.toISOString().slice(0, 10)

    if (!days[key]) break
    streak++
  }

  return streak
}
