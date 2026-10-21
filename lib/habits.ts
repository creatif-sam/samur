// Daily habit streaks shared by the Today screen and the evening nudge.

import { addDays } from '@/lib/dates'

export type HabitKey = 'prayer' | 'meditation' | 'reading' | 'bible' | 'verse'

export const HABITS: { key: HabitKey; label: string; emoji: string; href: string }[] = [
  { key: 'prayer', label: 'Prayer', emoji: '🙏', href: '/protected/posts?tab=prayer' },
  { key: 'meditation', label: 'Meditation', emoji: '📖', href: '/protected/posts?tab=meditations' },
  { key: 'bible', label: 'Bible', emoji: '✝️', href: '/protected/bible' },
  { key: 'verse', label: 'Memory verse', emoji: '🧠', href: '/protected/posts?tab=meditations' },
  { key: 'reading', label: 'Reading', emoji: '📚', href: '/protected/readapp' },
]

// Consecutive days ending today, or yesterday if today isn't done yet (today still counts as "in progress")
export function currentStreak(days: Set<string>, todayKey: string) {
  let cursor = days.has(todayKey) ? todayKey : addDays(todayKey, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function lastNDays(todayKey: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(todayKey, i - n + 1))
}
