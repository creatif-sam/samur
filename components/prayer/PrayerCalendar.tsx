'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Flame, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionDay {
  date: Date
  count: number
  state: 'before' | 'prayed' | 'missed' | 'future'
}

interface Props {
  userId: string
  refreshKey?: number
}

export default function PrayerCalendar({ userId, refreshKey }: Props): JSX.Element {
  const supabase = createClient()
  const [days, setDays] = useState<SessionDay[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [streak, setStreak] = useState(0)
  const [selectedDay, setSelectedDay] = useState<SessionDay | null>(null)

  const toISO = (d: Date) => d.toLocaleDateString('en-CA')

  useEffect(() => {
    void loadCalendar()
  }, [viewDate, userId, refreshKey])

  const loadCalendar = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Journey start — first ever session
    const { data: first } = await supabase
      .from('prayer_sessions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()

    const journeyStart = first ? new Date(first.date + 'T00:00:00') : new Date()
    journeyStart.setHours(0, 0, 0, 0)

    // Sessions for current month
    const { data: sessions } = await supabase
      .from('prayer_sessions')
      .select('date')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', toISO(firstDay))
      .lte('date', toISO(lastDay))

    // Group by date — count per day
    const countMap = new Map<string, number>()
    sessions?.forEach(s => {
      countMap.set(s.date, (countMap.get(s.date) ?? 0) + 1)
    })

    // Streak: fetch last 60 days and compute in JS
    const sixtyDaysAgo = new Date(today)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const { data: streakData } = await supabase
      .from('prayer_sessions')
      .select('date')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', toISO(sixtyDaysAgo))
    const prayedSet = new Set(streakData?.map(s => s.date) ?? [])

    let currentStreak = 0
    const cursor = new Date(today)
    // Allow today to still be in-progress (check from yesterday if today empty)
    if (!prayedSet.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (prayedSet.has(toISO(cursor))) {
      currentStreak++
      cursor.setDate(cursor.getDate() - 1)
    }
    setStreak(currentStreak)

    // Build calendar grid
    const grid: SessionDay[] = []
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    // Padding cells before month start
    for (let i = firstDay.getDay(); i > 0; i--) {
      grid.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        count: 0,
        state: 'before',
      })
    }

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const iso = toISO(date)
      const count = countMap.get(iso) ?? 0

      let state: SessionDay['state']
      if (date < journeyStart) state = 'before'
      else if (date > today) state = 'future'
      else if (count > 0) state = 'prayed'
      else state = 'missed'

      grid.push({ date, count, state })
    }

    setDays(grid)
  }

  return (
    <div className="space-y-0">
      <div className="rounded-[24px] border border-border/40 bg-card dark:bg-zinc-900/40 backdrop-blur-sm p-6 shadow-sm transition-colors duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tighter text-foreground">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
              <Flame size={14} className="fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {streak} Day Streak
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon" className="rounded-full"
              onClick={() => setViewDate(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost" size="icon" className="rounded-full"
              onClick={() => setViewDate(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div
              key={i}
              className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-tighter"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-3 justify-items-center">
          {days.map((day, i) => {
            const isToday = day.date.toDateString() === new Date().toDateString()

            return (
              <button
                key={i}
                disabled={day.state === 'before' || day.state === 'future' || day.state === 'missed'}
                onClick={() => day.state === 'prayed' && setSelectedDay(day)}
                className={clsx(
                  'relative h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-90',
                  day.state === 'prayed' && 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
                  day.state === 'missed' && 'bg-muted text-muted-foreground/50',
                  day.state === 'future' && 'text-muted-foreground/30',
                  day.state === 'before' && 'opacity-0 pointer-events-none',
                  isToday && day.state !== 'prayed' && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900'
                )}
              >
                {/* Show fire icon on prayed days, number otherwise */}
                {day.state === 'prayed' ? (
                  <Flame className="w-4 h-4 fill-white text-white" />
                ) : (
                  day.date.getDate()
                )}

                {/* Badge for multiple sessions in a day */}
                {day.count > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-white text-amber-600 text-[8px] font-black flex items-center justify-center border border-amber-400 shadow-sm">
                    {day.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-amber-500 flex items-center justify-center">
              <Flame className="w-2.5 h-2.5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-muted" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-white border border-amber-400 text-amber-600 text-[7px] font-black flex items-center justify-center">2</div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sessions</span>
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Prayer Record</p>
                <h3 className="text-xl font-bold mt-0.5">
                  {selectedDay.date.toLocaleDateString(undefined, { dateStyle: 'full' })}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDay(null)}>
                <X size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200/40 dark:border-amber-800/30">
              <div className="flex gap-1">
                {Array.from({ length: Math.min(selectedDay.count, 5) }).map((_, i) => (
                  <Flame key={i} className="w-7 h-7 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <div>
                <p className="text-2xl font-black text-foreground leading-none">{selectedDay.count}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  prayer session{selectedDay.count !== 1 ? 's' : ''} this day
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
