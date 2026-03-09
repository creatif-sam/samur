'use client'

import { useMemo, useState } from 'react'
import { MeditationDB } from '@/lib/types'
import StreakCalendarModal from '@/components/meditations/StreakCalendarModal'

interface Meditation {
  id: string
  title: string
  author_id: string
  created_at: string
  period: 'morning' | 'evening'
}

interface Props {
  meditations: MeditationDB[]

   ownerId: string
  accountCreatedAt: string
}

interface DayCell {
  date: Date
  label: string
}

function formatDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function getStreakDays(meditations: Meditation[]): DayCell[] {
  if (!meditations.length) return []

  const timestamps = meditations.map((m) =>
    new Date(m.created_at).getTime(),
  )

  const first = new Date(Math.min(...timestamps))
  first.setDate(first.getDate() - 1)
  first.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DayCell[] = []
  const cursor = new Date(first)

  while (cursor <= today) {
    days.push({
      date: new Date(cursor),
      label: cursor.toLocaleDateString(undefined, {
        weekday: 'short',
      }),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export default function MeditationStreakBoard({
  meditations,
  ownerId,
  accountCreatedAt,
}: Props) {
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  // Use ALL meditations (both private and shared) for streak tracking - OR logic
  const scopedMeditations = useMemo(
    () => meditations, // Include all meditations, not just own
    [meditations],
  )

  const days = useMemo(
    () => getStreakDays(scopedMeditations),
    [scopedMeditations],
  )

  const visibleDays = days.slice(-5)

  const groupedByDay = useMemo(() => {
    const map: Record<string, Meditation[]> = {}

    scopedMeditations.forEach((m) => {
      const key = formatDay(new Date(m.created_at))
      map[key] = map[key] ? [...map[key], m] : [m]
    })

    return map
  }, [scopedMeditations])

  const streakStats = useMemo(() => {
    // Calculate current streak (from today backwards)
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if user meditated today or yesterday (grace period)
    const todayKey = formatDay(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = formatDay(yesterday)
    
    // Start counting from today if there's a meditation, otherwise from yesterday
    let startIndex = days.length - 1
    if (!groupedByDay[todayKey]) {
      // If no meditation today, check yesterday for grace period
      if (groupedByDay[yesterdayKey]) {
        startIndex = days.length - 2
      } else {
        // No grace period, streak is broken
        currentStreak = 0
        startIndex = -1
      }
    }
    
    // Count consecutive days backwards
    if (startIndex >= 0) {
      for (let i = startIndex; i >= 0; i--) {
        if (groupedByDay[formatDay(days[i].date)]) {
          currentStreak++
        } else {
          break
        }
      }
    }
    
    // Calculate longest streak ever (scan all history)
    let longestStreak = 0
    let tempStreak = 0
    
    for (let i = 0; i < days.length; i++) {
      if (groupedByDay[formatDay(days[i].date)]) {
        tempStreak++
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    }
    
    return { currentStreak, longestStreak }
  }, [days, groupedByDay])

  if (!days.length) return null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium">
            🔥 Current Streak: {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'day' : 'days'}
          </div>
          {streakStats.longestStreak > streakStats.currentStreak && (
            <div className="text-xs text-muted-foreground">
              🏆 Best: {streakStats.longestStreak} days
            </div>
          )}
        </div>

      <button
  onClick={() => setShowCalendar(true)}
  className="px-3 py-1 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 transition"
>
  View
</button>

      </div>

      {/* Board */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {visibleDays.map((day) => {
          const key = formatDay(day.date)
          const entries = groupedByDay[key]
          const done = Boolean(entries)

          return (
            <div
              key={key}
              className="relative flex flex-col items-center gap-1"
            >
              <button
                onClick={() =>
                  setActiveDay(activeDay === key ? null : key)
                }
                className={`relative h-11 w-11 rounded-full overflow-hidden flex items-center justify-center text-lg
                  ${!done ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {done && (
                  <>
                    {entries?.some(
                      (m) => m.period === 'morning',
                    ) && (
                      <div className="absolute top-0 left-0 h-1/2 w-full bg-violet-600" />
                    )}

                    {entries?.some(
                      (m) => m.period === 'evening',
                    ) && (
                      <div className="absolute bottom-0 left-0 h-1/2 w-full bg-indigo-600" />
                    )}
                  </>
                )}

                <span className="relative z-10">
                  {done ? '🔥' : '😈'}
                </span>
              </button>

              <span className="text-xs text-muted-foreground">
                {day.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-base">😈</span>
          <span>No meditation</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-base">🔥</span>
          <span>Completed</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-violet-500" />
          <span>Morning</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
          <span>Evening</span>
        </div>
      </div>

<StreakCalendarModal
  open={showCalendar}
  onClose={() => setShowCalendar(false)}
  groupedByDay={groupedByDay}
  accountCreatedAt={accountCreatedAt}
/>



    </div>
  )
}
