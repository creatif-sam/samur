'use client'

import { useMemo, useState } from 'react'

interface Meditation {
  id: string
  title: string
  created_at: string
  period: 'morning' | 'evening'
}

interface Props {
  meditations?: Meditation[]
}

interface DayCell {
  date: Date
  label: string
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Build streak days starting one day before first meditation
 */
function getStreakDays(meditations: Meditation[]): DayCell[] {
  if (!meditations.length) return []

  const timestamps = meditations.map((m) =>
    new Date(m.created_at).getTime(),
  )

  const first = new Date(Math.min(...timestamps))
  first.setDate(first.getDate() - 1)

  const today = new Date()
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
  meditations = [],
}: Props) {
  const [activeDay, setActiveDay] = useState<string | null>(null)

  const days = useMemo(
    () => getStreakDays(meditations),
    [meditations],
  )

  const groupedByDay = useMemo(() => {
    const map: Record<string, Meditation[]> = {}

    meditations.forEach((m) => {
      const key = formatDay(new Date(m.created_at))
      map[key] = map[key] ? [...map[key], m] : [m]
    })

    return map
  }, [meditations])

  const streakCount = useMemo(() => {
    let count = 0

    for (let i = days.length - 1; i >= 0; i--) {
      const key = formatDay(days[i].date)
      if (groupedByDay[key]) count++
      else break
    }

    return count
  }, [days, groupedByDay])

  const perfectWeek =
    days.length >= 7 &&
    days.slice(-7).every(
      (d) => groupedByDay[formatDay(d.date)],
    )

  if (!days.length) return null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Streak {streakCount}
          {streakCount >= 3 && ' 🔥🔥🔥'}
        </div>

        {perfectWeek && <div className="text-lg">👑</div>}
      </div>

      {/* Board */}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const key = formatDay(day.date)
          const entries = groupedByDay[key]
          const done = Boolean(entries)

          const periodColor =
            entries?.some((m) => m.period === 'morning')
              ? 'bg-violet-600'
              : 'bg-indigo-600'

          return (
            <div
              key={key}
              className="relative flex flex-col items-center gap-1"
            >
             <button
  onClick={() =>
    setActiveDay(activeDay === key ? null : key)
  }
  className={`relative h-11 w-11 rounded-full overflow-hidden flex items-center justify-center text-lg transition
    ${!done ? 'bg-muted text-muted-foreground' : ''}
    ${activeDay === key ? 'scale-110' : ''}
  `}
>
  {done && (
    <>
      {/* Morning half */}
      {entries?.some((m) => m.period === 'morning') && (
        <div className="absolute top-0 left-0 h-1/2 w-full bg-violet-600" />
      )}

      {/* Evening half */}
      {entries?.some((m) => m.period === 'evening') && (
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

            {/* Legend */}
            

              {/* Tooltip */}
             {activeDay === key && entries && (
  <div className="absolute top-13 z-20 w-40 rounded border bg-background px-2 py-1 shadow-sm text-[11px] leading-snug">
    <ul className="space-y-0.5">
      {entries.map((m) => (
        <li
          key={m.id}
          className="truncate"
          title={m.title}
        >
          • {m.title}
        </li>
      ))}
    </ul>
  </div>
)}


            </div>
          )
        })}
      </div>
      {/* Simple legend */}
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

    </div>
    
  )
}


