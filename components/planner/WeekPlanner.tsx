'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/contexts/TranslationContext'
import { appLocale } from '@/lib/i18n'
import { toast } from 'sonner'
import { AlertTriangle, Download, Check, ChevronLeft, ChevronRight, Mountain, RefreshCw } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import WeekBalance from './WeekBalance'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { isMissingRoles, loadRocks, weekLabel, weekStart, type WeeklyRock } from '@/lib/roles'
import { dayLoad, loadWeek, rockProgress, rockTarget, type WeekDay } from '@/lib/planner/week'
import { sortByStart, type PlannerTask } from '@/lib/planner/tasks'
import { taskLook, type RoleLike, type VisionLike } from '@/lib/planner/roleLinks'
import { weekToIcs } from '@/lib/planner/ics'

const LONG_PRESS_MS = 350
const SLOP_PX = 8
const CHEERS_KEY = 'planner-cheers:v1'

type Partner = { id: string; name: string | null }
type Drag = { task: PlannerTask; from: string; over: string | null; x: number; y: number }

function readCheers(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CHEERS_KEY) ?? '[]')) } catch { return new Set() }
}

// The week at a glance (Sunday to Saturday): how time is shared between roles, the big
// rocks, and each day's events, with clashes and full days flagged. Tap a day to open it;
// hold one of your events and drag it onto another day to move it. With a partner, their
// shared week can be seen too, and what they finish cheered on.
export default function WeekPlanner({
  selectedKey, userId, rolesMap, visionsMap, onPickDay, onMoveToDay, partner = null, myName = null,
  initialDays, initialRocks, initialPartnerRocks,
}: {
  selectedKey: string
  userId: string | null
  rolesMap: Record<string, RoleLike>
  visionsMap: Record<string, VisionLike>
  onPickDay: (day: string) => void
  onMoveToDay?: (task: PlannerTask, from: string, to: string) => void
  partner?: Partner | null
  myName?: string | null
  // Data can be given by the caller (previews); otherwise it comes from the database
  initialDays?: WeekDay[]
  initialRocks?: WeeklyRock[]
  initialPartnerRocks?: WeeklyRock[]
}) {
  const { tr } = useTranslation()
  const supabase = createClient()
  const [start, setStart] = useState(() => weekStart(selectedKey))
  const [days, setDays] = useState<WeekDay[] | null>(initialDays ?? null)
  const [allRocks, setRocks] = useState<WeeklyRock[]>(initialRocks ?? [])
  const [partnerRocks, setPartnerRocks] = useState<WeeklyRock[]>(initialPartnerRocks ?? [])
  const [failed, setFailed] = useState(false)
  const [who, setWho] = useState<'me' | 'partner'>('me')
  const [cheered, setCheered] = useState<Set<string>>(() => new Set())
  const todayKey = toLocalDateKey(new Date())
  const partnerId = partner?.id ?? null

  useEffect(() => { setCheered(readCheers()) }, [])

  useEffect(() => {
    if (!userId || initialDays) return
    let live = true
    const noRocks = (err: { message?: string }) => { if (isMissingRoles(err?.message)) return [] as WeeklyRock[]; throw err }
    const load = async () => {
      setFailed(false)
      try {
        const [week, weekRocks, theirRocks] = await Promise.all([
          loadWeek(supabase, userId, start, partnerId),
          loadRocks(supabase, userId, start).catch(noRocks),
          // Seen only once the partner update is run; until then simply none
          partnerId ? loadRocks(supabase, partnerId, start).catch(() => [] as WeeklyRock[]) : Promise.resolve([] as WeeklyRock[]),
        ])
        if (!live) return
        setDays(week)
        setRocks(weekRocks)
        setPartnerRocks(theirRocks)
      } catch (err) {
        console.error('Failed to load week', err)
        if (live) setFailed(true)
      }
    }
    setDays(null)
    load()
    window.addEventListener('planner:changed', load)
    return () => { live = false; window.removeEventListener('planner:changed', load) }
  }, [userId, start, partnerId, initialDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const viewingPartner = who === 'partner' && !!partner
  const ownerOf = (t: PlannerTask) => t.owner_id || userId
  const shown = (days ?? []).map(d => ({
    day: d.day,
    tasks: d.tasks.filter(t => (viewingPartner ? ownerOf(t) === partnerId : ownerOf(t) === userId)),
    completed: viewingPartner ? d.partnerCompleted ?? [] : d.completed,
  }))
  const allTasks = shown.flatMap(d => d.tasks)
  const rocks = viewingPartner
    ? partnerRocks
    : allRocks.filter(r => r.role_id === null || (!!rolesMap[r.role_id] && !rolesMap[r.role_id].is_archived))
  const progress = rockProgress(shown, viewingPartner ? partnerId : userId)
  const rocksDone = rocks.filter(r => r.done).length
  const rocksBooked = rocks.filter(r => (progress[r.id]?.booked ?? 0) >= rockTarget(r)).length

  // ---------- cheering your partner on ----------
  async function cheer(key: string, text: string) {
    if (!partner || cheered.has(key)) return
    const next = new Set(cheered).add(key)
    setCheered(next)
    try { localStorage.setItem(CHEERS_KEY, JSON.stringify([...next].slice(-300))) } catch { /* storage unavailable */ }
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: partner.id,
          type: 'cheer',
          title: tr('{name} cheered you on 👏', { name: myName || tr('Your partner') }),
          body: text,
          url: '/protected/planner',
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(tr('Cheer sent to {name}', { name: partner.name || tr('your partner') }))
    } catch {
      const undo = new Set(next)
      undo.delete(key)
      setCheered(undo)
      toast.error(tr('Couldn\'t send the cheer'))
    }
  }

  // ---------- export to a phone calendar ----------
  async function exportWeek() {
    if (!days) return
    const ics = weekToIcs(shown, userId, { calendarName: 'Mastery' })
    const name = `mastery-week-${start}.ics`
    const file = new File([ics], name, { type: 'text/calendar' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: tr('My week') })
        return
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  // ---------- hold an event and drop it on another day ----------
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; id: number } | null>(null)
  const suppressClick = useRef(false)
  const lastY = useRef(0)
  const onMoveRef = useRef(onMoveToDay)
  onMoveRef.current = onMoveToDay

  const dayAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest('[data-day]') as HTMLElement | null)?.dataset.day ?? null
  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  function startDrag(task: PlannerTask, from: string, x: number, y: number) {
    const d = { task, from, over: from, x, y }
    dragRef.current = d
    lastY.current = y
    setDrag(d)
    try { navigator.vibrate?.(10) } catch { /* not supported */ }
  }
  useEffect(() => cancelPress, [])

  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    const update = (x: number, y: number) => {
      const d = dragRef.current
      if (!d) return
      lastY.current = y
      dragRef.current = { ...d, x, y, over: dayAt(x, y) }
      setDrag(dragRef.current)
    }
    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); if (e.touches[0]) update(e.touches[0].clientX, e.touches[0].clientY) }
    // Near the top or bottom of the screen the page scrolls, so any day can be reached
    const scroller = setInterval(() => {
      const y = lastY.current
      const step = y < 90 ? -14 : y > window.innerHeight - 140 ? 14 : 0
      if (!step) return
      window.scrollBy(0, step)
      const d = dragRef.current
      if (d) { dragRef.current = { ...d, over: dayAt(d.x, d.y) }; setDrag(dragRef.current) }
    }, 30)
    const finish = () => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d) return
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 50)
      if (d.over && d.over !== d.from) onMoveRef.current?.(d.task, d.from, d.over)
    }
    const onCancel = (e: PointerEvent) => { if (e.pointerType !== 'touch') finish() }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerup', finish)
    window.addEventListener('touchend', finish)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      clearInterval(scroller)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('touchend', finish)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [dragging])

  function pressHandlers(task: PlannerTask, from: string) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button > 0) return
        cancelPress()
        const { clientX: x, clientY: y, pointerId: id } = e
        const timer = setTimeout(() => { press.current = null; startDrag(task, from, x, y) }, LONG_PRESS_MS)
        if (e.pointerType === 'mouse') clearTimeout(timer)
        press.current = { timer, x, y, id }
      },
      onPointerMove: (e: React.PointerEvent) => {
        const p = press.current
        if (!p || p.id !== e.pointerId) return
        const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y)
        if (e.pointerType === 'mouse') {
          if (moved > 4) { cancelPress(); startDrag(task, from, e.clientX, e.clientY) }
        } else if (moved > SLOP_PX) cancelPress()
      },
      onPointerUp: cancelPress,
      onPointerCancel: cancelPress,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }
  }

  const canMove = !viewingPartner && !!onMoveToDay

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

      {/* Your week or your partner's */}
      {partner && (
        <div className="flex rounded-2xl border border-white/50 bg-white/60 p-1 dark:border-slate-700/50 dark:bg-slate-800/60">
          {([['me', tr('My week')], ['partner', partner.name || tr('Partner')]] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setWho(value)}
              aria-pressed={who === value}
              className={`flex-1 truncate rounded-xl px-2 py-1.5 text-xs font-bold transition-all ${who === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {failed ? (
        <p className="rounded-3xl border-2 border-dashed border-red-200 p-6 text-center text-sm font-semibold text-slate-600 dark:border-red-900/50 dark:text-slate-300">{tr('Couldn\'t load this week')}</p>
      ) : !days ? (
        <>
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200/40 dark:bg-slate-800/40" />
        </>
      ) : (
        <>
          {/* Balance between roles (yours), or your partner's big rocks to cheer */}
          <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
            {viewingPartner ? (
              <>
                <div className="mb-2 flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{tr('Their big rocks')}</span>
                  <HelpTip topic="planner.partnerweek" align="left" className="-my-1" />
                </div>
                {rocks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tr('No big rocks shared for this week yet.')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {rocks.map(r => {
                      const key = `${partnerId}:rock:${r.id}`
                      return (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${r.done ? 'border-transparent bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {r.done && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className={`min-w-0 flex-1 truncate font-semibold ${r.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{r.text}</span>
                          {r.done && <CheerButton sent={cheered.has(key)} onClick={() => cheer(key, r.text)} />}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="mt-3 text-[11px] text-slate-400">{tr('Only the events they share with you are shown.')}</p>
              </>
            ) : (
              <>
                <div className="mb-2.5 flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{tr('Time per role')}</span>
                  <HelpTip topic="planner.week" align="left" className="-my-1" />
                </div>
                <WeekBalance tasks={allTasks} rolesMap={rolesMap} visionsMap={visionsMap} />
                {rocks.length > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Mountain className="h-3.5 w-3.5" />
                    {tr('Big rocks: {done} of {total} done, {booked} with time booked', { done: rocksDone, total: rocks.length, booked: rocksBooked })}
                  </p>
                )}
                {allTasks.length > 0 && (
                  <button onClick={exportWeek} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                    <Download className="h-3.5 w-3.5" /> {tr('Export this week to your calendar')}
                  </button>
                )}
              </>
            )}
          </div>

          {canMove && <p className="px-2 text-[11px] font-semibold text-slate-400">{tr('Hold an event, then drag it onto another day to move it.')}</p>}

          {/* The seven days */}
          <div className="space-y-2">
            {shown.map(d => {
              const sorted = sortByStart(d.tasks)
              const doneCount = d.tasks.filter(t => d.completed.includes(t.id)).length
              const date = parseDateKey(d.day)
              const isToday = d.day === todayKey
              const isSelected = d.day === selectedKey
              const isTarget = !!drag && drag.over === d.day && drag.from !== d.day
              const load = viewingPartner ? { clashes: 0, full: false } : dayLoad(d.tasks)
              const open = () => { if (!suppressClick.current && !drag) onPickDay(d.day) }
              return (
                <div
                  key={d.day}
                  data-day={d.day}
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                  className={`flex w-full cursor-pointer gap-3 rounded-3xl border p-3 text-left shadow-sm backdrop-blur-sm transition-all ${isTarget ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-950/40' : isSelected ? 'border-violet-400 bg-white/90 dark:border-violet-500 dark:bg-slate-800/90' : 'border-white/50 bg-white/70 dark:border-slate-700/50 dark:bg-slate-800/70'} ${d.day < todayKey && !isTarget ? 'opacity-75' : ''}`}
                >
                  <div className={`flex w-11 shrink-0 flex-col items-center justify-center self-start rounded-2xl py-1.5 ${isToday ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{date.toLocaleDateString(appLocale(), { weekday: 'short' })}</span>
                    <span className="text-lg font-black leading-none">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {(load.clashes > 0 || load.full) && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {[
                          load.clashes > 0 ? tr('{n} {n:clash|clashes}', { n: load.clashes }) : '',
                          load.full ? tr('No free time') : '',
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {sorted.length === 0 ? (
                      <p className="pt-2.5 text-xs font-semibold text-slate-400">{tr('Nothing planned')}</p>
                    ) : (
                      <>
                        <ul className="space-y-1">
                          {sorted.slice(0, 5).map(t => {
                            const look = taskLook(t, rolesMap)
                            const isDone = d.completed.includes(t.id)
                            const isDragged = drag?.task.id === t.id && drag.from === d.day
                            const key = `${partnerId}:task:${t.id}:${d.day}`
                            return (
                              <li
                                key={t.id}
                                {...(canMove ? pressHandlers(t, d.day) : {})}
                                style={{ WebkitTouchCallout: 'none' }}
                                className={`flex select-none items-center gap-2 rounded-lg text-xs ${isDragged ? 'opacity-30' : ''}`}
                              >
                                <span className={`h-3.5 w-1 shrink-0 rounded-full ${look.className}`} style={look.style} />
                                <span className="shrink-0 tabular-nums font-semibold text-slate-400">{t.start}</span>
                                <span className={`min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-200 ${isDone ? 'line-through opacity-50' : ''}`}>{t.text}</span>
                                {t.recurring && <RefreshCw className="h-2.5 w-2.5 shrink-0 text-slate-400" />}
                                {viewingPartner && isDone && (
                                  <CheerButton sent={cheered.has(key)} onClick={() => cheer(key, t.text)} small />
                                )}
                              </li>
                            )
                          })}
                        </ul>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {sorted.length > 5 && <>{tr('+{n} more', { n: sorted.length - 5 })} · </>}
                          {tr('{done} of {total} done', { done: doneCount, total: d.tasks.length })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* The event under the finger while it is being moved */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 max-w-[70vw] -translate-x-1/2 -translate-y-full truncate rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-xl"
          style={{ left: drag.x, top: drag.y - 12 }}
        >
          {drag.task.start} {drag.task.text}
        </div>
      )}
    </div>
  )
}

function CheerButton({ sent, onClick, small }: { sent: boolean; onClick: () => void; small?: boolean }) {
  const { tr } = useTranslation()
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      onPointerDown={e => e.stopPropagation()}
      disabled={sent}
      aria-label={sent ? tr('Cheer sent') : tr('Cheer them on')}
      className={`shrink-0 rounded-full font-bold transition-all active:scale-90 ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} ${sent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}
    >
      {sent ? '👏 ✓' : '👏'}
    </button>
  )
}
