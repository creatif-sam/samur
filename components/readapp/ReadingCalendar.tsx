'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import { X, ChevronLeft, ChevronRight, Flame, BookOpen } from 'lucide-react'
import { ReadingCategory, ReadingStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'

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

export default function ReadingCalendar({ readings }: ReadingCalendarProps) {
  const supabase = createClient()

  const [days, setDays] = useState<CalendarDay[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [journeyStart, setJourneyStart] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [streak, setStreak] = useState(0)

  const toISODate = (d: Date) => d.toLocaleDateString('en-CA')

  useEffect(() => {
    loadCalendar()
  }, [viewDate, readings])

  const loadCalendar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get Journey Start
    const { data: first } = await supabase
      .from('readings')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const start = first?.[0] ? new Date(first[0].created_at) : new Date()
    start.setHours(0, 0, 0, 0)
    setJourneyStart(start)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Fetch Logs
    const { data: logs } = await supabase
      .from('reading_logs')
      .select('reading_date, pages_read, note')
      .eq('user_id', user.id)
      .gte('reading_date', toISODate(firstDayOfMonth))
      .lte('reading_date', toISODate(lastDayOfMonth))

    const logMap = new Map<string, DayLog[]>()
    logs?.forEach(l => {
      if (!logMap.has(l.reading_date)) logMap.set(l.reading_date, [])
      logMap.get(l.reading_date)?.push({ pages_read: l.pages_read, note: l.note })
    })

    // Calculate Streak in memory — single query instead of N+1 loop
    const { data: recentLogs } = await supabase
      .from('reading_logs')
      .select('reading_date')
      .eq('user_id', user.id)
      .lte('reading_date', toISODate(today))
      .order('reading_date', { ascending: false })

    const logDateSet = new Set((recentLogs ?? []).map((l) => l.reading_date))
    let currentStreak = 0
    const streakCursor = new Date(today)
    while (logDateSet.has(toISODate(streakCursor))) {
      currentStreak++
      streakCursor.setDate(streakCursor.getDate() - 1)
    }
    setStreak(currentStreak)

    // Build Calendar Grid
    const temp: CalendarDay[] = []
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    
    // Padding for start of month
    for (let i = firstDayOfMonth.getDay(); i > 0; i--) {
      temp.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        state: 'before',
        logs: [],
      })
    }

    // Days of month
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const iso = toISODate(date)
      const logsForDay = logMap.get(iso) ?? []

      let state: DayState = 'read'
      if (date < start) state = 'before'
      else if (date > today) state = 'future'
      else if (logsForDay.length === 0) state = 'missed'

      temp.push({ date, state, logs: logsForDay })
    }

    setDays(temp)
  }

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1))
  }

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="rounded-[24px] border border-border/40 bg-card dark:bg-zinc-900/40 backdrop-blur-sm p-6 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tighter text-foreground">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
              <Flame size={14} className="fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {streak} Day Streak
              </span>
            </div>
          </div>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 mb-2">
          {['S','M','T','W','T','F','S'].map(d => (
            <div key={d} className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-tighter">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-3 justify-items-center">
          {days.map((day, i) => {
            const isToday = day.date.toDateString() === new Date().toDateString()
            
            return (
              <button
                key={i}
                disabled={day.state === 'before' || day.state === 'future'}
                onClick={() => day.logs.length > 0 && setSelectedDay(day)}
                className={clsx(
                  'relative h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-90',
                  day.state === 'read' && 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
                  day.state === 'missed' && 'bg-muted text-muted-foreground/50',
                  day.state === 'future' && 'text-muted-foreground/30',
                  day.state === 'before' && 'opacity-0 pointer-events-none',
                  isToday && day.state !== 'read' && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900'
                )}
              >
                {day.date.getDate()}
                {day.state === 'read' && (
                   <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border-2 border-emerald-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">Reading Log</p>
                <h3 className="text-xl font-bold">
                  {selectedDay.date.toLocaleDateString(undefined, { dateStyle: 'full' })}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDay(null)}>
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              {selectedDay.logs.map((log, idx) => (
                <div key={idx} className="bg-muted/50 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-violet-500" />
                    <span className="font-bold text-sm">{log.pages_read} Pages Read</span>
                  </div>
                  {log.note && (
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      "{log.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}