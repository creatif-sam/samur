'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Moon, Sun, X } from 'lucide-react'
import { addDays, toLocalDateKey } from '@/lib/dates'

type Entry = { id: string; title?: string | null; period: 'morning' | 'evening' }

interface Props {
  open: boolean
  onClose: () => void
  groupedByDay: Record<string, Entry[]>
  accountCreatedAt: string
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
// Noon avoids daylight-saving edges when turning a date key back into a Date
const fromKey = (key: string) => new Date(`${key}T12:00:00`)

export default function StreakCalendarModal({ open, onClose, groupedByDay, accountCreatedAt }: Props) {
  const [mounted, setMounted] = useState(false)
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Every time it opens: this month, nothing selected
  useEffect(() => {
    if (!open) return
    setActiveMonth(startOfMonth(new Date()))
    setSelected(null)
  }, [open])

  // Escape closes; the page behind doesn't scroll
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const todayKey = toLocalDateKey(new Date())
  const keys = useMemo(() => Object.keys(groupedByDay).sort(), [groupedByDay])

  // Your journey starts at whichever is earlier: joining, or your first entry
  const startKey = useMemo(() => {
    const joined = toLocalDateKey(new Date(accountCreatedAt))
    return keys[0] && keys[0] < joined ? keys[0] : joined
  }, [accountCreatedAt, keys])

  const firstMonth = startOfMonth(fromKey(startKey))
  const currentMonth = startOfMonth(new Date())
  const canGoPrev = activeMonth > firstMonth
  const canGoNext = activeMonth < currentMonth

  const days = useMemo(() => {
    const total = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate()
    return Array.from({ length: total }, (_, i) => toLocalDateKey(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), i + 1)))
  }, [activeMonth])
  const offset = activeMonth.getDay()

  const stats = useMemo(() => {
    // Days that count: from the start of your journey up to today
    const counted = days.filter(k => k >= startKey && k <= todayKey)
    const meditated = counted.filter(k => groupedByDay[k])
    const entries = meditated.reduce((n, k) => n + groupedByDay[k].length, 0)
    let best = 0, run = 0
    for (const k of counted) { run = groupedByDay[k] ? run + 1 : 0; best = Math.max(best, run) }
    const year = String(activeMonth.getFullYear())
    const yearDays = keys.filter(k => k.startsWith(year)).length
    return { counted: counted.length, meditated: meditated.length, entries, best, year, yearDays }
  }, [days, startKey, todayKey, groupedByDay, keys, activeMonth])

  // Current streak (today, or up to yesterday while today is still open)
  const streak = useMemo(() => {
    let cursor = groupedByDay[todayKey] ? todayKey : addDays(todayKey, -1)
    let n = 0
    while (groupedByDay[cursor]) { n++; cursor = addDays(cursor, -1) }
    return n
  }, [groupedByDay, todayKey])

  const selectedEntries = selected ? groupedByDay[selected] ?? [] : []

  function changeMonth(step: number) {
    setActiveMonth(m => addMonths(m, step))
    setSelected(null)
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Meditation calendar">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full max-w-md bg-background rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90dvh]"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
          >
            <div className="flex justify-center pt-3 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 grid place-items-center">
                  <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Meditation</p>
                  <p className="text-sm font-black leading-tight">Your journey</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full bg-muted grid place-items-center active:scale-90 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-2">
              {/* Month switcher */}
              <div className="flex items-center justify-between py-3">
                <button
                  onClick={() => changeMonth(-1)}
                  disabled={!canGoPrev}
                  aria-label="Previous month"
                  className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted disabled:opacity-25 transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-center">
                  <p className="text-lg font-black tracking-tight">
                    {activeMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                  {monthKey(activeMonth) !== monthKey(currentMonth) && (
                    <button onClick={() => { setActiveMonth(currentMonth); setSelected(null) }} className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      Back to this month
                    </button>
                  )}
                </div>
                <button
                  onClick={() => changeMonth(1)}
                  disabled={!canGoNext}
                  aria-label="Next month"
                  className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted disabled:opacity-25 transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Month stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat label="Days" value={`${stats.meditated}`} sub={stats.counted ? `of ${stats.counted}` : '—'} />
                <Stat label="Entries" value={`${stats.entries}`} sub="this month" />
                <Stat label="Best run" value={`${stats.best}`} sub={stats.best === 1 ? 'day' : 'days'} />
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-black uppercase text-muted-foreground">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-y-2">
                {Array.from({ length: offset }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(key => {
                  const entries = groupedByDay[key] ?? []
                  const morning = entries.some(m => m.period === 'morning')
                  const evening = entries.some(m => m.period === 'evening')
                  const done = entries.length > 0
                  const isToday = key === todayKey
                  const future = key > todayKey
                  const beforeStart = key < startKey
                  const missed = !done && !future && !beforeStart && !isToday
                  return (
                    <div key={key} className="flex justify-center">
                      <button
                        onClick={() => !future && setSelected(s => (s === key ? null : key))}
                        disabled={future}
                        aria-label={`${fromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${done ? `${entries.length} meditation${entries.length > 1 ? 's' : ''}` : future ? 'upcoming' : 'none'}`}
                        className={`relative h-10 w-10 rounded-full overflow-hidden grid place-items-center transition ${
                          future || beforeStart ? 'bg-transparent' : missed ? 'bg-muted/60' : 'bg-muted'
                        } ${isToday ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background' : ''} ${
                          selected === key ? 'scale-110 shadow-md' : ''
                        }`}
                      >
                        {morning && <span className="absolute inset-x-0 top-0 h-1/2 bg-violet-500" />}
                        {evening && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-indigo-600" />}
                        <span className={`relative grid place-items-center rounded-full text-xs font-black ${missed ? '-mt-2.5' : ''} ${
                          done ? 'h-7 w-7 bg-background text-foreground shadow-sm'
                            : future || beforeStart ? 'text-muted-foreground/35'
                            : missed ? 'text-muted-foreground/60'
                            : 'text-foreground'
                        }`}>
                          {Number(key.slice(8))}
                        </span>
                        {missed && <span className="absolute bottom-0 text-[10px] leading-none" aria-hidden>😈</span>}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Selected day */}
              {selected && (
                <div className="mt-4 rounded-2xl bg-muted/50 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {fromKey(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  {selectedEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{selected === todayKey ? 'Nothing yet today. There’s still time.' : 'No meditation this day.'}</p>
                  ) : selectedEntries.map(m => (
                    <Link
                      key={m.id}
                      href={`/protected/meditations/${m.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 rounded-xl bg-background px-3 py-2.5 active:scale-[0.99] transition"
                    >
                      {m.period === 'morning'
                        ? <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                        : <Moon className="h-4 w-4 text-indigo-500 shrink-0" />}
                      <span className="text-sm font-semibold truncate flex-1">{m.title || 'Untitled'}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-violet-500" /> Morning</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-indigo-600" /> Evening</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full overflow-hidden flex flex-col"><span className="flex-1 bg-violet-500" /><span className="flex-1 bg-indigo-600" /></span>
                  Both
                </span>
                <span className="flex items-center gap-1.5"><span className="text-sm leading-none">😈</span> Missed</span>
              </div>

              {/* Footer summary */}
              <div className="mt-4 mb-1 flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 py-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Flame className={`h-4 w-4 ${streak ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                  {streak} day streak
                </span>
                <span className="h-4 w-px bg-border" />
                <span>{stats.yearDays} day{stats.yearDays !== 1 ? 's' : ''} in {stats.year}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2.5 text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xl font-black leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}
