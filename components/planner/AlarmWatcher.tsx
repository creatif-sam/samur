'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlarmClock, BellOff, Check, TimerReset } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries'
import { alertMinutes, buildDayTasks, parseMinutes, type PlannerTask } from '@/lib/planner/tasks'
import { finishedRockIds } from '@/lib/planner/week'

// Planner alarms while the app is open: at a task's alert time (or when its alarm push
// arrives) a full-screen alarm rings on a loop until it's snoozed, done or stopped.
// With the app closed, the alarm is the push notification sent by /api/cron/task-reminders.

type Alarm = { taskId: string; day: string; text: string; start: string; at: number }
type Ringing = Omit<Alarm, 'at'>
type Record_ = { rang?: boolean; snoozeUntil?: number }

const STORE_KEY = 'planner-alarms'
const RING_WINDOW_MS = 15 * 60_000 // a missed alarm still rings if the app opens within 15 min
const SNOOZE_MS = 5 * 60_000
const TICK_MS = 15_000
const RELOAD_MS = 5 * 60_000
const SOUND = '/sounds/upcoming.mp3'
const VIBRATION = [600, 300, 600, 300, 600]

const keyOf = (day: string, taskId: string) => `${day}:${taskId}`

function loadStore(): Record<string, Record_> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, Record_>) {
  // Forget days before yesterday
  const keep = addDays(toLocalDateKey(new Date()), -1)
  const pruned = Object.fromEntries(Object.entries(store).filter(([k]) => k.slice(0, 10) >= keep))
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(pruned))
  } catch { /* storage unavailable */ }
}

function updateRecord(day: string, taskId: string, change: Record_) {
  const store = loadStore()
  const key = keyOf(day, taskId)
  store[key] = { ...store[key], ...change }
  saveStore(store)
}

// Local time of day + minutes, as a timestamp (DST-safe)
function timeOn(day: string, minutes: number) {
  const d = parseDateKey(day)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes).getTime()
}

export default function AlarmWatcher() {
  const { tr } = useTranslation()
  const [supabase] = useState(createClient)
  const [ringing, setRinging] = useState<Ringing | null>(null)
  const alarmsRef = useRef<Alarm[]>([])
  const userIdRef = useRef<string | null>(null)
  const ringingRef = useRef<Ringing | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const vibrateTimer = useRef<number | null>(null)
  const loadedFor = useRef('')

  const stopSound = useCallback(() => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    if (vibrateTimer.current !== null) window.clearInterval(vibrateTimer.current)
    vibrateTimer.current = null
    try { navigator.vibrate?.(0) } catch { /* not supported */ }
  }, [])

  const ring = useCallback((alarm: Ringing) => {
    const current = ringingRef.current
    if (current && current.taskId === alarm.taskId && current.day === alarm.day) return
    updateRecord(alarm.day, alarm.taskId, { rang: true, snoozeUntil: undefined })
    ringingRef.current = alarm
    setRinging(alarm)
    audioRef.current?.play().catch(() => { /* blocked until the next tap; the card still shows */ })
    try {
      navigator.vibrate?.(VIBRATION)
      vibrateTimer.current = window.setInterval(() => navigator.vibrate?.(VIBRATION), 3000)
    } catch { /* not supported */ }
  }, [])

  const closeRinging = useCallback(() => {
    stopSound()
    ringingRef.current = null
    setRinging(null)
  }, [stopSound])

  // Today's and tomorrow's alarm tasks (tomorrow's early ones can be due before midnight)
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user.id ?? null
    userIdRef.current = uid
    if (!uid) {
      alarmsRef.current = []
      return
    }
    const today = toLocalDateKey(new Date())
    const days = [today, addDays(today, 1)]
    try {
      const recurringRows = await fetchRecurringRows(supabase, [uid], days[1])
      const found: { task: PlannerTask; day: string }[] = []
      for (const day of days) {
        const dayRows = await fetchDayRows(supabase, [uid], day)
        const done = new Set(dayRows[0]?.completed_task_ids ?? [])
        for (const task of buildDayTasks({ dateKey: day, userId: uid, dayRows, recurringRows })) {
          if (!task.alarm || done.has(task.id) || (task.owner_id && task.owner_id !== uid)) continue
          found.push({ task, day })
        }
      }
      // Time booked for a big rock that is already done doesn't ring
      const finished = await finishedRockIds(supabase, found.map(f => f.task.rock_id))
      const next: Alarm[] = []
      for (const { task, day } of found) {
        if (task.rock_id && finished.has(task.rock_id)) continue
        const lead = alertMinutes(task) ?? 0
        next.push({ taskId: task.id, day, text: task.text, start: task.start, at: timeOn(day, parseMinutes(task.start) - lead) })
      }
      alarmsRef.current = next
      loadedFor.current = today
    } catch {
      // Offline: keep the alarms already loaded
    }
  }, [supabase])

  const tick = useCallback(() => {
    if (toLocalDateKey(new Date()) !== loadedFor.current) void load()
    if (ringingRef.current) return
    const now = Date.now()
    const store = loadStore()
    for (const a of alarmsRef.current) {
      const rec = store[keyOf(a.day, a.taskId)]
      const due = rec?.snoozeUntil
        ? now >= rec.snoozeUntil
        : !rec?.rang && now >= a.at && now < a.at + RING_WINDOW_MS
      if (due) {
        ring(a)
        return
      }
    }
  }, [load, ring])

  useEffect(() => {
    const audio = new Audio(SOUND)
    audio.loop = true
    audio.preload = 'auto'
    audioRef.current = audio

    // Browsers only allow sound after a tap: unlock this element on the first one
    const unlock = () => {
      audio.muted = true
      audio.play().then(() => {
        if (!ringingRef.current) { audio.pause(); audio.currentTime = 0 }
        audio.muted = false
      }).catch(() => { audio.muted = false })
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    void load().then(tick)
    const ticker = window.setInterval(tick, TICK_MS)
    const reloader = window.setInterval(() => void load(), RELOAD_MS)
    const onChanged = () => void load().then(tick)
    const onVisible = () => { if (document.visibilityState === 'visible') onChanged() }
    window.addEventListener('planner:changed', onChanged)
    document.addEventListener('visibilitychange', onVisible)

    // The alarm push arrived while a window is open: ring here too
    const onMessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg?.type !== 'mastery-alarm' || !msg.taskId || !msg.day) return
      const rec = loadStore()[keyOf(msg.day, msg.taskId)]
      if (rec?.rang && !rec.snoozeUntil) return
      ring({ taskId: msg.taskId, day: msg.day, text: msg.text || 'Planner alarm', start: msg.start || '' })
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)

    return () => {
      window.clearInterval(ticker)
      window.clearInterval(reloader)
      window.removeEventListener('planner:changed', onChanged)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      audio.pause()
    }
  }, [load, tick, ring])

  function snooze() {
    if (!ringing) return
    updateRecord(ringing.day, ringing.taskId, { snoozeUntil: Date.now() + SNOOZE_MS })
    closeRinging()
    toast(tr('Snoozed for 5 minutes'), { description: tr('Keep Mastery open to hear it ring again.') })
  }

  async function markDone() {
    if (!ringing) return
    const { taskId, day } = ringing
    closeRinging()
    // The planner completes it if that day is on screen; otherwise save it here
    const detail: { taskId: string; day: string; handled?: boolean } = { taskId, day }
    window.dispatchEvent(new CustomEvent('planner:complete', { detail }))
    if (detail.handled) return
    const uid = userIdRef.current
    if (!uid) return
    const { data: row, error } = await supabase
      .from('planner_days')
      .select('completed_task_ids')
      .eq('user_id', uid)
      .eq('day', day)
      .maybeSingle()
    if (error) { toast.error(tr('Couldn\'t mark it done')); return }
    const ids: string[] = row?.completed_task_ids ?? []
    if (ids.includes(taskId)) return
    const { error: saveError } = row
      ? await supabase.from('planner_days').update({ completed_task_ids: [...ids, taskId] }).eq('user_id', uid).eq('day', day)
      : await supabase.from('planner_days').insert({ user_id: uid, day, tasks: [], completed_task_ids: [taskId], visibility: 'private' })
    if (saveError) toast.error(tr('Couldn\'t mark it done'))
    else toast.success(tr('Marked as done'))
  }

  if (!ringing) return null

  return (
    <div role="alertdialog" aria-modal="true" aria-label={tr('Planner alarm')} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-[32px] bg-background p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlarmClock className="h-10 w-10 text-rose-500 animate-bounce" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">{tr('Alarm')}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight break-words">{ringing.text}</h2>
        {ringing.start && <p className="mt-1 text-sm text-muted-foreground">{tr('Starts at {start}', { start: ringing.start })}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={snooze} className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted py-3 text-sm font-bold active:scale-95">
            <TimerReset className="h-4 w-4" />{' '}{tr('Snooze 5 min')}
          </button>
          <button onClick={markDone} className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white active:scale-95">
            <Check className="h-4 w-4" />{' '}{tr('Done')}
          </button>
        </div>
        <button onClick={closeRinging} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-muted-foreground active:bg-muted">
          <BellOff className="h-4 w-4" />{' '}{tr('Stop alarm')}
        </button>
      </div>
    </div>
  )
}
