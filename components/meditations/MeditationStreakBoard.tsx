'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Flame, Moon, Sun, Trophy } from 'lucide-react'
import type { MeditationDB } from '@/lib/types'
import StreakCalendarModal from '@/components/meditations/StreakCalendarModal'
import { addDays, toLocalDateKey } from '@/lib/dates'

type Entry = Pick<MeditationDB, 'id' | 'title' | 'author_id' | 'created_at' | 'period'>

interface Props {
  meditations: MeditationDB[]
  ownerId: string
  accountCreatedAt: string
}

export function groupByDay<T extends { created_at: string }>(items: T[]) {
  const map: Record<string, T[]> = {}
  for (const m of items) {
    const key = toLocalDateKey(new Date(m.created_at))
    ;(map[key] ??= []).push(m)
  }
  return map
}

// Current streak counts back from today (or yesterday, if today isn't done yet)
export function computeStreaks(days: Record<string, unknown>) {
  const today = toLocalDateKey(new Date())
  let cursor = days[today] ? today : addDays(today, -1)
  let current = 0
  while (days[cursor]) { current++; cursor = addDays(cursor, -1) }

  const keys = Object.keys(days).sort()
  let best = 0, run = 0
  let prev: string | null = null
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return { current, best }
}

// The last 7 days at a glance: top half = morning, bottom half = evening
export default function MeditationStreakBoard({ meditations, ownerId, accountCreatedAt }: Props) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [activeDay, setActiveDay] = useState<string | null>(null)

  // Only your own meditations count toward your streak (not your partner's shared ones)
  const own = useMemo(() => meditations.filter(m => m.author_id === ownerId) as Entry[], [meditations, ownerId])
  const byDay = useMemo(() => groupByDay(own), [own])
  const { current, best } = useMemo(() => computeStreaks(byDay), [byDay])

  const today = toLocalDateKey(new Date())
  const joinedKey = toLocalDateKey(new Date(accountCreatedAt))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const activeEntries = activeDay ? byDay[activeDay] ?? [] : []

  return (
    <section className="rounded-3xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-11 w-11 shrink-0 rounded-2xl grid place-items-center ${current > 0 ? 'bg-orange-100 dark:bg-orange-500/15' : 'bg-muted'}`}>
            <Flame className={`h-5 w-5 ${current > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black leading-tight">
              {current} day{current !== 1 ? 's' : ''} <span className="text-sm font-bold text-muted-foreground">streak</span>
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {best > current
                ? <><Trophy className="h-3 w-3 text-amber-500" /> Best: {best} days</>
                : current > 0 ? 'Your best streak yet' : 'Write today to start a streak'}
            </p>
          </div>
          <HelpTip topic="spirit.streak" align="left" />
        </div>
        <button
          onClick={() => setShowCalendar(true)}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground active:scale-95 transition"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Calendar
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map(key => {
          const entries = byDay[key] ?? []
          const morning = entries.some(m => m.period === 'morning')
          const evening = entries.some(m => m.period === 'evening')
          const isToday = key === today
          const missed = entries.length === 0 && !isToday && key >= joinedKey
          const date = new Date(key + 'T12:00:00')
          return (
            <button
              key={key}
              onClick={() => setActiveDay(d => (d === key ? null : key))}
              className="flex flex-col items-center gap-1.5"
              aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${entries.length ? `${entries.length} meditation${entries.length > 1 ? 's' : ''}` : 'none'}`}
            >
              <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`}>
                {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
              <span
                className={`relative h-10 w-10 rounded-full overflow-hidden grid place-items-center bg-muted transition ${
                  isToday ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-card' : ''
                } ${activeDay === key ? 'scale-110' : ''}`}
              >
                {morning && <span className="absolute inset-x-0 top-0 h-1/2 bg-violet-500" />}
                {evening && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-indigo-600" />}
                {/* Inner disc keeps the date readable over the morning/evening halves */}
                <span className={`relative grid place-items-center rounded-full text-xs font-black ${
                  entries.length ? 'h-7 w-7 bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                } ${missed ? '-mt-2.5' : ''}`}>
                  {date.getDate()}
                </span>
                {missed && <span className="absolute bottom-0 text-[10px] leading-none" aria-hidden>😈</span>}
              </span>
            </button>
          )
        })}
      </div>

      {activeDay && (
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {new Date(activeDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          {activeEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No meditation this day.</p>
          ) : activeEntries.map(m => (
            <Link key={m.id} href={`/protected/meditations/${m.id}`} className="flex items-center gap-2 text-sm font-semibold">
              {m.period === 'morning' ? <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
              <span className="truncate">{m.title || 'Untitled'}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Morning</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Evening</span>
        <span className="flex items-center gap-1.5"><span className="text-xs leading-none">😈</span> Missed</span>
      </div>

      <StreakCalendarModal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        groupedByDay={byDay}
        accountCreatedAt={accountCreatedAt}
      />
    </section>
  )
}
