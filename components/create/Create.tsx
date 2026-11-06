'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { addDays, toLocalDateKey } from '@/lib/dates'
import {
  clearTimer, formatDuration, hhmm, hoursFromMinutes, loadTimer, recentActivities, saveTimer, sortLogs,
  timeOf, timerResult, weekStats, WORK_TYPES, type CreativeLog, type RunningTimer, type WorkType,
} from '@/lib/create'
import CreateHero from './CreateHero'
import CreateTimer from './CreateTimer'
import CreateForm, { emptyForm, type FormValues } from './CreateForm'
import CreateLog from './CreateLog'

const COLS = 'id, work_date, start_time, end_time, hours_worked, worked_on, produced, aligned, focused, work_type, notes'
const PAGE = 60

type FormState = { mode: 'new' | 'timer' | 'edit'; values: FormValues; id?: string; key: number }

const normalize = (row: Record<string, unknown>): CreativeLog => ({
  id: String(row.id),
  work_date: String(row.work_date).slice(0, 10),
  start_time: (row.start_time as string | null) ?? null,
  end_time: (row.end_time as string | null) ?? null,
  hours_worked: Number(row.hours_worked) || 0,
  worked_on: String(row.worked_on ?? ''),
  produced: (row.produced as string | null) ?? null,
  aligned: (row.aligned as boolean | null) ?? null,
  focused: (row.focused as boolean | null) ?? null,
  work_type: String(row.work_type ?? ''),
  notes: (row.notes as string | null) ?? null,
})

const merge = (current: CreativeLog[], incoming: CreativeLog[]) => {
  const byId = new Map(current.map(l => [l.id, l]))
  for (const l of incoming) byId.set(l.id, l)
  return sortLogs([...byId.values()])
}

export default function Create() {
  const supabase = useMemo(() => createClient(), [])
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [todayKey, setTodayKey] = useState('')
  const [logs, setLogs] = useState<CreativeLog[]>([])
  const [loadError, setLoadError] = useState(false)
  const [loadedFrom, setLoadedFrom] = useState('')
  const [olderCount, setOlderCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [running, setRunning] = useState<RunningTimer | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLDivElement | null>(null)

  const countOlder = async (uid: string, before: string) => {
    const { count } = await supabase.from('creative_work').select('id', { count: 'exact', head: true }).eq('user_id', uid).lt('work_date', before)
    setOlderCount(count ?? 0)
  }

  // Everything from the last four weeks: enough for the week card, the streak and the first view
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const today = toLocalDateKey(new Date())
      const { data: auth } = await supabase.auth.getUser()
      if (cancelled) return
      setTodayKey(today)
      setRunning(loadTimer()) // read after mount: the timer lives in this device's storage
      if (!auth.user) { setReady(true); return }
      setUserId(auth.user.id)
      const since = addDays(today, -27)
      const { data, error } = await supabase
        .from('creative_work')
        .select(COLS)
        .eq('user_id', auth.user.id)
        .gte('work_date', since)
        .order('work_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(500)
      if (cancelled) return
      if (error) setLoadError(true)
      else setLogs(sortLogs((data ?? []).map(normalize)))
      setLoadedFrom(since)
      await countOlder(auth.user.id, since)
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    if (form) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [form?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => (todayKey ? weekStats(logs, todayKey) : null), [logs, todayKey])
  const recent = useMemo(() => recentActivities(logs), [logs])

  // ── Older sessions ──
  const loadOlder = async () => {
    if (!userId || !loadedFrom) return
    setLoadingMore(true)
    const { data, error } = await supabase
      .from('creative_work')
      .select(COLS)
      .eq('user_id', userId)
      .lt('work_date', loadedFrom)
      .order('work_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(PAGE)
    if (error || !data) {
      toast.error("Couldn't load older sessions")
      setLoadingMore(false)
      return
    }
    let rows = data.map(normalize)
    let nextFrom = loadedFrom
    if (rows.length > 0) {
      nextFrom = rows[rows.length - 1].work_date
      if (rows.length === PAGE) {
        // The last day may continue past this page: fetch all of it so its total is right
        const { data: rest } = await supabase.from('creative_work').select(COLS).eq('user_id', userId).eq('work_date', nextFrom)
        rows = [...rows, ...(rest ?? []).map(normalize)]
      }
    }
    setLogs(prev => merge(prev, rows))
    setLoadedFrom(nextFrom)
    await countOlder(userId, nextFrom)
    setLoadingMore(false)
  }

  // ── Timer ──
  const start = () => {
    const t = { startedAt: Date.now(), activity: '' }
    saveTimer(t)
    setRunning(t)
  }
  const setActivity = (activity: string) =>
    setRunning(prev => {
      if (!prev) return prev
      const next = { ...prev, activity }
      saveTimer(next)
      return next
    })
  const discardTimer = () => {
    if (!window.confirm('Discard this session? The time so far will be lost.')) return
    clearTimer()
    setRunning(null)
  }
  const stop = () => {
    if (!running) return
    const now = Date.now()
    let r = timerResult(running.startedAt, now)
    if (now - running.startedAt < 60_000 && !window.confirm('That was under a minute. Keep it as a 1 minute session?')) {
      clearTimer()
      setRunning(null)
      return
    }
    // Always at least one minute apart on the clock
    if (r.start === r.end) r = { ...r, end: timeOf(new Date(running.startedAt + 60_000)) }
    if (now - running.startedAt > 24 * 3_600_000) toast.warning('That timer ran for over a day. Please set the real times.')
    clearTimer()
    setRunning(null)
    setForm({ mode: 'timer', key: now, values: { ...emptyForm(), date: r.date, start: r.start, end: r.end, workedOn: running.activity } })
  }

  // ── Form ──
  const openPast = () => setForm({ mode: 'new', key: Date.now(), values: emptyForm() })
  const openEdit = (log: CreativeLog) =>
    setForm({
      mode: 'edit',
      id: log.id,
      key: Date.now(),
      values: {
        date: log.work_date,
        start: hhmm(log.start_time),
        end: hhmm(log.end_time),
        workedOn: log.worked_on,
        produced: log.produced ?? '',
        workType: (WORK_TYPES.some(t => t.id === log.work_type) ? log.work_type : 'creation') as WorkType,
        aligned: log.aligned,
        focused: log.focused,
        notes: log.notes ?? '',
      },
    })
  const cancelForm = () => {
    if (form?.mode === 'timer' && !window.confirm('Discard this session? The timer time will be lost.')) return
    setForm(null)
  }

  const save = async (v: FormValues, minutes: number) => {
    if (!userId || !form) return
    setSaving(true)
    const payload = {
      work_date: v.date,
      start_time: v.start,
      end_time: v.end,
      hours_worked: hoursFromMinutes(minutes),
      work_type: v.workType,
      worked_on: v.workedOn.trim(),
      produced: v.produced.trim() || null,
      aligned: v.aligned,
      focused: v.focused,
      notes: v.notes.trim() || null,
    }

    if (form.mode === 'edit' && form.id) {
      const before = logs
      setLogs(prev => sortLogs(prev.map(l => (l.id === form.id ? { ...l, ...payload } : l))))
      // A blocked update changes zero rows without an error, so an empty result counts as a failure
      const { data, error } = await supabase.from('creative_work').update(payload).eq('id', form.id).eq('user_id', userId).select(COLS)
      if (error || !data?.length) {
        setLogs(before)
        toast.error("Couldn't save the changes. Editing may not be allowed yet.")
        setSaving(false)
        return
      }
      setLogs(prev => merge(prev, [normalize(data[0])]))
      toast.success('Session updated')
    } else {
      const { data, error } = await supabase.from('creative_work').insert({ user_id: userId, ...payload }).select(COLS).single()
      if (error || !data) {
        toast.error('Failed to save the session')
        setSaving(false)
        return
      }
      setLogs(prev => merge(prev, [normalize(data)]))
      toast.success(`Session saved: ${formatDuration(payload.hours_worked)}`)
    }
    setForm(null)
    setSaving(false)
  }

  const remove = async (log: CreativeLog) => {
    if (!userId) return
    const before = logs
    setLogs(prev => prev.filter(l => l.id !== log.id))
    const { data, error } = await supabase.from('creative_work').delete().eq('id', log.id).eq('user_id', userId).select('id')
    if (error || !data?.length) {
      setLogs(before)
      toast.error("Couldn't delete this session. Deleting may not be allowed yet.")
      return
    }
    toast.success('Session deleted')
  }

  if (!ready || !stats) {
    return (
      <div className="space-y-5 pb-24" aria-busy>
        <div className="h-52 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-24 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <CreateHero stats={stats} />

      {loadError && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Couldn&apos;t load your sessions. Check your connection and reopen this tab.
        </p>
      )}

      <div ref={formRef} className="scroll-mt-20">
        {form ? (
          <CreateForm
            key={form.key}
            title={form.mode === 'edit' ? 'Edit session' : form.mode === 'timer' ? 'Save your session' : 'Log a past session'}
            mode={form.mode}
            initial={form.values}
            recent={recent}
            saving={saving}
            onSave={save}
            onCancel={cancelForm}
          />
        ) : (
          <CreateTimer
            running={running}
            recent={recent}
            onStart={start}
            onActivity={setActivity}
            onStop={stop}
            onDiscard={discardTimer}
            onLogPast={openPast}
            busy={false}
          />
        )}
      </div>

      <CreateLog
        logs={logs}
        todayKey={todayKey}
        olderCount={olderCount}
        loadingMore={loadingMore}
        onLoadMore={loadOlder}
        onEdit={openEdit}
        onDelete={remove}
      />
    </div>
  )
}
