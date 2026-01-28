'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { ReadingCategory, ReadingStatus } from '@/lib/types'

type DayState = 'before' | 'read' | 'missed' | 'future'

export interface Reading {
  id: string
  title: string
  author?: string
  status: ReadingStatus
  category: ReadingCategory
  total_pages: number
  pages_remaining: number
}

interface ReadingCalendarProps {
  readings: Reading[]
}

interface DayLog {
  pages_read: number
  note: string | null
}

interface CalendarDay {
  date: Date
  state: DayState
  logs: DayLog[]
}

export default function ReadingCalendar(
  { readings }: ReadingCalendarProps
) {
  const supabase = createClient()

  const [days, setDays] = useState<CalendarDay[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [journeyStart, setJourneyStart] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    void loadCalendar()
  }, [viewDate, readings])

  const toISODate = (d: Date) =>
    d.toLocaleDateString('en-CA')

  const loadCalendar = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: first } = await supabase
      .from('readings')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (!first || first.length === 0) return

    const start = new Date(first[0].created_at)
    start.setHours(0, 0, 0, 0)
    setJourneyStart(start)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const { data: logs } = await supabase
      .from('reading_logs')
      .select('reading_date, pages_read, note')
      .eq('user_id', user.id)
      .gte('reading_date', toISODate(firstDay))
      .lte('reading_date', toISODate(lastDay))

    const logMap = new Map<string, DayLog[]>()

    logs?.forEach(l => {
      if (!logMap.has(l.reading_date)) {
        logMap.set(l.reading_date, [])
      }
      logMap.get(l.reading_date)?.push({
        pages_read: l.pages_read,
        note: l.note,
      })
    })

    let currentStreak = 0
    const streakCursor = new Date(today)

    while (true) {
      const iso = toISODate(streakCursor)
      if (logMap.has(iso)) {
        currentStreak++
        streakCursor.setDate(streakCursor.getDate() - 1)
      } else break
    }

    setStreak(currentStreak)

    const temp: CalendarDay[] = []

    for (let i = 0; i < firstDay.getDay(); i++) {
      temp.push({
        date: new Date(),
        state: 'before',
        logs: [],
      })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)

      const iso = toISODate(date)
      const logsForDay = logMap.get(iso) ?? []

      let state: DayState
      if (date < start) state = 'before'
      else if (date > today) state = 'future'
      else if (logsForDay.length > 0) state = 'read'
      else state = 'missed'

      temp.push({
        date,
        state,
        logs: logsForDay,
      })
    }

    setDays(temp)
  }

  const changeMonth = (delta: number) => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + delta,
        1
      )
    )
  }

  return (
    <>
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)}>Prev</button>

          <div className="text-center">
            <div className="text-lg font-semibold">
              {viewDate.toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="text-xs">
              Streak {streak} day{streak === 1 ? '' : 's'}
            </div>
          </div>

          <button onClick={() => changeMonth(1)}>Next</button>
        </div>

        <div className="grid grid-cols-7 text-xs text-center">
          {['S','M','T','W','T','F','S'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => (
            <div key={i} className="flex justify-center">
              <button
                disabled={day.state === 'before'}
                onClick={() =>
                  day.logs.length > 0 && setSelectedDay(day)
                }
                className={clsx(
                  'h-10 w-10 rounded-full flex items-center justify-center text-sm',
                  day.state === 'before' && 'bg-gray-200',
                  day.state === 'read' && 'bg-emerald-300',
                  day.state === 'missed' && 'bg-gray-100',
                  day.state === 'future' && 'bg-transparent'
                )}
              >
                {day.state === 'read' && '🧠'}
                {day.state === 'missed' && '🤡'}
                {day.state !== 'before' &&
                  day.state !== 'future' && (
                    <span className="absolute text-xs">
                      {day.date.getDate()}
                    </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-md rounded-xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {selectedDay.date.toDateString()}
              </h3>
              <button onClick={() => setSelectedDay(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDay.logs.map((log, idx) => (
              <div key={idx} className="border rounded-lg p-3 mb-2 text-sm">
                <div className="font-medium">
                  {log.pages_read} pages
                </div>
                {log.note && (
                  <div className="mt-1">
                    {log.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
