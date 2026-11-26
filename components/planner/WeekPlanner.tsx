'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/contexts/TranslationContext'
import { appLocale } from '@/lib/i18n'
import { ChevronLeft, ChevronRight, Mountain, RefreshCw } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import WeekBalance from './WeekBalance'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { isMissingRoles, loadRocks, weekLabel, weekStart, type WeeklyRock } from '@/lib/roles'
import { loadWeek, type WeekDay } from '@/lib/planner/week'
import { sortByStart } from '@/lib/planner/tasks'
import { taskLook, type RoleLike, type VisionLike } from '@/lib/planner/roleLinks'

// The week at a glance (Sunday to Saturday): how time is shared between roles,
// the big rocks, and each day's events. Tapping a day opens it.
export default function WeekPlanner({ selectedKey, userId, rolesMap, visionsMap, onPickDay, initialDays, initialRocks }: {
  selectedKey: string
  userId: string | null
  rolesMap: Record<string, RoleLike>
  visionsMap: Record<string, VisionLike>
  onPickDay: (day: string) => void
  // Data can be given by the caller (previews); otherwise it comes from the database
  initialDays?: WeekDay[]
  initialRocks?: WeeklyRock[]
}) {
  const { tr } = useTranslation()
  const supabase = createClient()
  const [start, setStart] = useState(() => weekStart(selectedKey))
  const [days, setDays] = useState<WeekDay[] | null>(initialDays ?? null)
  const [allRocks, setRocks] = useState<WeeklyRock[]>(initialRocks ?? [])
  const [failed, setFailed] = useState(false)
  const todayKey = toLocalDateKey(new Date())

  useEffect(() => {
    if (!userId || initialDays) return
    let live = true
    const load = async () => {
      setFailed(false)
      try {
        const [week, weekRocks] = await Promise.all([
          loadWeek(supabase, userId, start),
          loadRocks(supabase, userId, start).catch(err => { if (isMissingRoles(err?.message)) return [] as WeeklyRock[]; throw err }),
        ])
        if (!live) return
        setDays(week)
        setRocks(weekRocks)
      } catch (err) {
        console.error('Failed to load week', err)
        if (live) setFailed(true)
      }
    }
    setDays(null)
    load()
    window.addEventListener('planner:changed', load)
    return () => { live = false; window.removeEventListener('planner:changed', load) }
  }, [userId, start, initialDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const allTasks = (days ?? []).flatMap(d => d.tasks.filter(t => !t.owner_id || t.owner_id === userId))
  const rocks = allRocks.filter(r => r.role_id === null || (!!rolesMap[r.role_id] && !rolesMap[r.role_id].is_archived))
  const booked = new Set(allTasks.map(t => t.rock_id).filter(Boolean))
  const rocksDone = rocks.filter(r => r.done).length

  return (
    <div className="space-y-4 px-4 pb-24">
      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/70 px-2 py-2 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
        <button onClick={() => setStart(s => addDays(s, -7))} aria-label={tr('Previous week')} className="rounded-xl p-2 text-slate-600 active:scale-90 dark:text-slate-300">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{weekLabel(start)}</p>
          {start !== weekStart(todayKey) && (
            <button onClick={() => setStart(weekStart(todayKey))} className="text-[11px] font-bold text-violet-600 dark:text-violet-400">{tr('This week')}</button>
          )}
        </div>
        <button onClick={() => setStart(s => addDays(s, 7))} aria-label={tr('Next week')} className="rounded-xl p-2 text-slate-600 active:scale-90 dark:text-slate-300">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {failed ? (
        <p className="rounded-3xl border-2 border-dashed border-red-200 p-6 text-center text-sm font-semibold text-slate-600 dark:border-red-900/50 dark:text-slate-300">{tr('Couldn\'t load this week')}</p>
      ) : !days ? (
        <>
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200/40 dark:bg-slate-800/40" />
        </>
      ) : (
        <>
          {/* Balance between roles */}
          <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
            <div className="mb-2.5 flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{tr('Time per role')}</span>
              <HelpTip topic="planner.week" align="left" className="-my-1" />
            </div>
            <WeekBalance tasks={allTasks} rolesMap={rolesMap} visionsMap={visionsMap} />
            {rocks.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Mountain className="h-3.5 w-3.5" />
                {tr('Big rocks: {done} of {total} done, {booked} with time booked', { done: rocksDone, total: rocks.length, booked: rocks.filter(r => booked.has(r.id)).length })}
              </p>
            )}
          </div>

          {/* The seven days */}
          <div className="space-y-2">
            {days.map(d => {
              const own = d.tasks.filter(t => !t.owner_id || t.owner_id === userId)
              const sorted = sortByStart(own)
              const doneCount = own.filter(t => d.completed.includes(t.id)).length
              const date = parseDateKey(d.day)
              const isToday = d.day === todayKey
              const isSelected = d.day === selectedKey
              return (
                <button
                  key={d.day}
                  onClick={() => onPickDay(d.day)}
                  className={`flex w-full gap-3 rounded-3xl border p-3 text-left shadow-sm backdrop-blur-sm transition-all active:scale-[0.99] ${isSelected ? 'border-violet-400 bg-white/90 dark:border-violet-500 dark:bg-slate-800/90' : 'border-white/50 bg-white/70 dark:border-slate-700/50 dark:bg-slate-800/70'} ${d.day < todayKey ? 'opacity-75' : ''}`}
                >
                  <div className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-2xl py-1.5 ${isToday ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{date.toLocaleDateString(appLocale(), { weekday: 'short' })}</span>
                    <span className="text-lg font-black leading-none">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {sorted.length === 0 ? (
                      <p className="pt-2.5 text-xs font-semibold text-slate-400">{tr('Nothing planned')}</p>
                    ) : (
                      <>
                        <ul className="space-y-1">
                          {sorted.slice(0, 4).map(t => {
                            const look = taskLook(t, rolesMap)
                            const isDone = d.completed.includes(t.id)
                            return (
                              <li key={t.id} className="flex items-center gap-2 text-xs">
                                <span className={`h-3.5 w-1 shrink-0 rounded-full ${look.className}`} style={look.style} />
                                <span className="shrink-0 tabular-nums font-semibold text-slate-400">{t.start}</span>
                                <span className={`min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200 ${isDone ? 'line-through opacity-50' : ''}`}>{t.text}</span>
                                {t.recurring && <RefreshCw className="h-2.5 w-2.5 shrink-0 text-slate-400" />}
                              </li>
                            )
                          })}
                        </ul>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {sorted.length > 4 && <>{tr('+{n} more', { n: sorted.length - 4 })} · </>}
                          {tr('{done} of {total} done', { done: doneCount, total: own.length })}
                        </p>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
