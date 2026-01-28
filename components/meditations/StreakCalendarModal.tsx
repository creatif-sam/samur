'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  groupedByDay: Record<string, any[]>
  accountCreatedAt: string
}

function formatDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function StreakCalendarModal({
  open,
  onClose,
  groupedByDay,
  accountCreatedAt,
}: Props) {
  if (!open) return null

  const createdDate = new Date(accountCreatedAt)
  createdDate.setHours(0, 0, 0, 0)

  const currentYear = new Date().getFullYear()

  const createdMonth = startOfMonth(createdDate)
  const currentMonth = startOfMonth(new Date())

  const [activeMonth, setActiveMonth] = useState(currentMonth)

  const canGoPrev = activeMonth > createdMonth
  const canGoNext = activeMonth < currentMonth

  const monthDays = useMemo(() => {
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: Date[] = []

    for (
      let d = new Date(firstDay);
      d <= lastDay;
      d.setDate(d.getDate() + 1)
    ) {
      const copy = new Date(d)
      copy.setHours(0, 0, 0, 0)
      days.push(copy)
    }

    return days
  }, [activeMonth])

  const monthStreakCount = useMemo(() => {
    return monthDays.filter(
      (d) =>
        d >= createdDate &&
        groupedByDay[formatDay(d)],
    ).length
  }, [monthDays, groupedByDay, createdDate])

  const yearlyMeditationCount = useMemo(() => {
    return Object.keys(groupedByDay).filter((key) => {
      const date = new Date(key)
      date.setHours(0, 0, 0, 0)

      return (
        date.getFullYear() === currentYear &&
        date >= createdDate
      )
    }).length
  }, [groupedByDay, createdDate, currentYear])

  const startOffset = monthDays[0].getDay()

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="bg-background w-full rounded-t-2xl pt-3 px-4 pb-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <button
            disabled={!canGoPrev}
            onClick={() =>
              canGoPrev &&
              setActiveMonth(addMonths(activeMonth, -1))
            }
            className={`text-sm ${
              !canGoPrev ? 'opacity-30' : 'underline'
            }`}
          >
            Prev
          </button>

          <div className="text-center">
            <div className="font-semibold">
              {activeMonth.toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {monthStreakCount} days this month
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close calendar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Year summary */}
        <div className="mb-2 text-center text-xs text-muted-foreground">
          {yearlyMeditationCount} days of meditation in this app this year
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 mb-1 text-xs text-center text-muted-foreground">
          {WEEK_DAYS.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        {/* Calendar */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startOffset }).map(
            (_, i) => (
              <div key={`empty-${i}`} />
            ),
          )}

          {monthDays.map((date) => {
            const key = formatDay(date)
            const entries = groupedByDay[key]

            const isBeforeJoin = date < createdDate
            const isJoinDay =
              formatDay(date) === formatDay(createdDate)
            const done = Boolean(entries)

            return (
              <div key={key} className="flex justify-center">
                <div
                  className={`relative h-8 w-8 rounded-full overflow-hidden flex items-center justify-center
                    ${
                      isBeforeJoin
                        ? 'bg-green-200 text-green-900'
                        : 'bg-muted'
                    }
                    ${
                      isJoinDay
                        ? 'ring-2 ring-green-500'
                        : ''
                    }
                  `}
                >
                  {!isBeforeJoin && (
                    <>
                      {entries?.some(
                        (m) => m.period === 'morning',
                      ) && (
                        <div className="absolute top-0 h-1/2 w-full bg-violet-600" />
                      )}

                      {entries?.some(
                        (m) => m.period === 'evening',
                      ) && (
                        <div className="absolute bottom-0 h-1/2 w-full bg-indigo-600" />
                      )}
                    </>
                  )}

                  <span className="relative z-10 text-sm">
                    {isBeforeJoin
                      ? date.getDate()
                      : done
                      ? '🔥'
                      : '😈'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="text-base">🔥</span>
            <span>Meditated</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-base">😈</span>
            <span>No meditation</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-green-200" />
            <span>Days before joining</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full ring-2 ring-green-500" />
            <span>Joined</span>
          </div>
        </div>
      </div>
    </div>
  )
}
