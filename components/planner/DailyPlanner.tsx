'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar as CalendarIcon, Check, RefreshCw, BarChart3, Sun, Moon, ArrowRight, List, Clock3, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MonthCalendar from './MonthCalendar'

import { TaskModal, type SaveScope } from './tasks/TaskModal'
import TopCalendar from './TopCalendar'
import DaySummary from './DailySummary'
import FreeTimeExportButton from './FreeTimeExportButton'
import MoodPicker, { moodThemes } from './MoodPicker'
import { gradientFor } from './taskColors'
import PlannerTimeline from './PlannerTimeline'
import PlannerTodos, { type PlannerTodo } from './PlannerTodos'
import PlannerTemplates, { type TemplateTask } from './PlannerTemplates'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries'
import { dequeueDay, isNetworkError, queueDay, queuedDay, queuedDays, type QueuedDay } from '@/lib/planner/offline'
import {
  buildDayTasks,
  endsNextDay,
  nextFreeSlot,
  sortByStart,
  tasksToStore,
  type PlannerDayRow,
  type PlannerTask,
} from '@/lib/planner/tasks'

export type { PlannerTask } from '@/lib/planner/tasks'

type Vision = { id: string; title: string; emoji: string }
type UserProfile = { id: string; name?: string; avatar_url?: string }

type DaySnapshot = {
  dateKey: string
  tasks: PlannerTask[]
  morning: string
  reflection: string
  mood: string
  completedTaskIds: string[]
}

type StoredRow = {
  tasks: PlannerTask[]
  completed_task_ids: string[]
  morning: string
  reflection: string
  mood: string
}

const TEXT_SAVE_DELAY = 700

function formatDateKey(key: string) {
  return parseDateKey(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function withException(task: PlannerTask, dateKey: string): PlannerTask {
  if (!task.recurring) return task
  const exceptions = new Set(task.recurring.exceptions ?? [])
  exceptions.add(dateKey)
  return { ...task, recurring: { ...task.recurring, exceptions: Array.from(exceptions).sort() } }
}

export default function DailyPlanner() {
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [partnerCompletedIds, setPartnerCompletedIds] = useState<string[]>([])
  const [morning, setMorning] = useState('')
  const [reflection, setReflection] = useState('')
  const [mood, setMood] = useState('')
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [taskModalHour, setTaskModalHour] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null)
  const [visionsMap, setVisionsMap] = useState<Record<string, Vision>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({})
  const [view, setView] = useState<'daily' | 'monthly'>('daily')
  const [taskDays, setTaskDays] = useState<Set<string>>(new Set())
  const [schedulingForDate, setSchedulingForDate] = useState<string | null>(null)
  const [modalStart, setModalStart] = useState<number | null>(null)
  const [schedulingTodo, setSchedulingTodo] = useState<PlannerTodo | null>(null)
  const [todoRefresh, setTodoRefresh] = useState(0)
  const [showTemplates, setShowTemplates] = useState(false)
  const [layout, setLayout] = useState<'list' | 'timeline'>('list')
  const advanceDateRef = useRef<HTMLInputElement>(null)

  const dateKey = toLocalDateKey(selectedDate)
  const todayKey = toLocalDateKey(new Date())
  const theme = moodThemes[mood] || moodThemes['default']
  const loading = loadedDateKey !== dateKey

  // Latest state for async callbacks (debounced saves, undo actions)
  const stateRef = useRef<DaySnapshot & { loadedDateKey: string | null; userId: string | null }>(null!)
  stateRef.current = { dateKey, tasks, morning, reflection, mood, completedTaskIds, loadedDateKey, userId }

  // All writes run one after another so a slow save can never land after a newer one
  const writeChain = useRef<Promise<unknown>>(Promise.resolve())
  const pendingSave = useRef<{ snapshot: DaySnapshot; timer: ReturnType<typeof setTimeout> } | null>(null)
  const loadSeq = useRef(0)

  function enqueue<T>(job: () => Promise<T>, errorMessage: string): Promise<T | undefined> {
    const run = writeChain.current.then(job).catch((err) => {
      console.error(errorMessage, err)
      toast.error(errorMessage)
      return undefined
    })
    writeChain.current = run
    return run
  }

  // Remember list/timeline choice on this device
  useEffect(() => {
    try {
      const saved = localStorage.getItem('planner-layout')
      if (saved === 'list' || saved === 'timeline') setLayout(saved)
    } catch { /* storage unavailable */ }
  }, [])
  function chooseLayout(next: 'list' | 'timeline') {
    setLayout(next)
    try { localStorage.setItem('planner-layout', next) } catch { /* storage unavailable */ }
  }

  // ---------- loading ----------

  useEffect(() => { init() }, [])
  useEffect(() => { if (userId) loadDay() }, [dateKey, userId, partnerId])
  useEffect(() => {
    if (view === 'monthly' && userId) loadTaskDays(selectedDate.getFullYear(), selectedDate.getMonth())
  }, [view, userId, tasks])

  // Flush a pending text save when switching day, leaving the page or backgrounding the app
  useEffect(() => () => flushPendingSave(), [dateKey])
  useEffect(() => {
    const onOnline = () => { enqueue(flushOutbox, "Couldn't sync offline changes.").then(() => loadDay()) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId, partnerId])
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushPendingSave() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  async function init() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const uid = auth.user.id

    const [{ data: profile }, { data: visions }] = await Promise.all([
      supabase.from('profiles').select('partner_id').eq('id', uid).single(),
      supabase.from('visions').select('id, title, emoji').eq('owner_id', uid),
    ])

    if (visions) {
      const map: Record<string, Vision> = {}
      visions.forEach((v) => { map[v.id] = v })
      setVisionsMap(map)
    }

    const pid: string | null = profile?.partner_id || null
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', pid ? [uid, pid] : [uid])
    if (profiles) {
      const map: Record<string, UserProfile> = {}
      profiles.forEach((p) => { map[p.id] = p })
      setProfilesMap(map)
    }

    setPartnerId(pid)
    setUserId(uid)
  }

  async function loadDay() {
    if (!userId) return
    // Read the date from the ref: this may run after an await, once the user moved to another day
    const key = stateRef.current.dateKey
    const seq = ++loadSeq.current
    setLoadedDateKey(null)
    setLoadError(false)

    // Let queued writes land first so we never read a row mid-update
    await writeChain.current
    await enqueue(flushOutbox, "Couldn't sync offline changes.")

    try {
      const ids = partnerId ? [userId, partnerId] : [userId]
      const [dayRows, recurringRows] = await Promise.all([
        fetchDayRows(supabase, ids, key),
        fetchRecurringRows(supabase, ids, key),
      ])
      if (seq !== loadSeq.current) return

      const own = dayRows.find(r => r.user_id === userId)
      const partnerRow = partnerId ? dayRows.find(r => r.user_id === partnerId) : undefined

      setTasks(buildDayTasks({ dateKey: key, userId, dayRows, recurringRows }))
      setCompletedTaskIds(own?.completed_task_ids ?? [])
      setPartnerCompletedIds(partnerRow?.completed_task_ids ?? [])
      setMorning(own?.morning ?? '')
      setReflection(own?.reflection ?? '')
      setMood(own?.mood ?? '')
      setLoadedDateKey(key)
    } catch (err) {
      if (seq !== loadSeq.current) return
      // Offline with unsynced changes for this day: show what's on the device
      const queued = queuedDay(userId, key)
      if (queued && isNetworkError(err)) {
        setTasks(buildDayTasks({ dateKey: key, userId, dayRows: [queued], recurringRows: [queued] }))
        setCompletedTaskIds(queued.completed_task_ids)
        setPartnerCompletedIds([])
        setMorning(queued.morning)
        setReflection(queued.reflection)
        setMood(queued.mood)
        setLoadedDateKey(key)
        return
      }
      console.error('Failed to load planner day', err)
      setLoadError(true)
    }
  }

  async function loadTaskDays(year: number, month: number) {
    if (!userId) return
    const ids = partnerId ? [userId, partnerId] : [userId]
    const start = toLocalDateKey(new Date(year, month, 1))
    const end = toLocalDateKey(new Date(year, month + 1, 0))

    try {
      const [{ data, error }, recurringRows] = await Promise.all([
        supabase
          .from('planner_days')
          .select('day, user_id, tasks')
          .in('user_id', ids)
          .gte('day', start)
          .lte('day', end),
        fetchRecurringRows(supabase, ids, end),
      ])
      if (error) throw error

      const rows = (data ?? []) as PlannerDayRow[]
      const days = new Set<string>()
      for (let key = start; key <= end; key = addDays(key, 1)) {
        const dayRows = rows.filter(r => r.day === key)
        if (buildDayTasks({ dateKey: key, userId, dayRows, recurringRows }).length > 0) days.add(key)
      }
      setTaskDays(days)
    } catch (err) {
      console.error('Failed to load month', err)
    }
  }

  // ---------- saving the visible day ----------

  function writeDay(s: DaySnapshot) {
    const uid = stateRef.current.userId
    if (!uid) return Promise.resolve(undefined)
    const row: QueuedDay = {
      day: s.dateKey,
      user_id: uid,
      tasks: tasksToStore(s.tasks, uid, s.dateKey),
      completed_task_ids: s.completedTaskIds,
      morning: s.morning,
      reflection: s.reflection,
      mood: s.mood,
      visibility: 'private',
    }
    return enqueue(async () => {
      let error: unknown = null
      try {
        ;({ error } = await supabase.from('planner_days').upsert(row, { onConflict: 'user_id,day' }))
      } catch (err) {
        error = err
      }
      if (error && isNetworkError(error)) {
        // Keep it on this device and sync when the connection is back
        queueDay(row)
        toast("You're offline. Changes are saved on this device and will sync.", { id: 'planner-offline' })
        return
      }
      if (error) throw error
      dequeueDay(uid, row.day) // a newer save supersedes anything queued for this day
    }, "Couldn't save your planner. Check your connection.")
  }

  // Writes any saves made while offline; returns true if everything synced
  async function flushOutbox() {
    const uid = stateRef.current.userId
    if (!uid || typeof navigator !== 'undefined' && !navigator.onLine) return false
    const rows = queuedDays(uid)
    if (rows.length === 0) return true
    let ok = true
    for (const row of rows) {
      const { error } = await supabase.from('planner_days').upsert(row, { onConflict: 'user_id,day' })
      if (error) { ok = false; continue }
      dequeueDay(uid, row.day)
    }
    if (ok) toast.success('Offline changes synced', { id: 'planner-offline' })
    return ok
  }

  function snapshot(overrides: Partial<DaySnapshot> = {}): DaySnapshot | null {
    const { loadedDateKey, dateKey: key, tasks, morning, reflection, mood, completedTaskIds } = stateRef.current
    // Never write state that belongs to a different (or not yet loaded) day
    if (loadedDateKey !== key) return null
    return { dateKey: key, tasks, morning, reflection, mood, completedTaskIds, ...overrides }
  }

  function flushPendingSave() {
    const pending = pendingSave.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingSave.current = null
    writeDay(pending.snapshot)
  }

  function saveNow(overrides: Partial<DaySnapshot> = {}) {
    const s = snapshot(overrides)
    if (!s) return
    if (pendingSave.current) {
      clearTimeout(pendingSave.current.timer)
      pendingSave.current = null
    }
    writeDay(s)
  }

  function saveDebounced(overrides: Partial<DaySnapshot>) {
    const s = snapshot(overrides)
    if (!s) return
    if (pendingSave.current) clearTimeout(pendingSave.current.timer)
    pendingSave.current = {
      snapshot: s,
      timer: setTimeout(() => {
        pendingSave.current = null
        writeDay(s)
      }, TEXT_SAVE_DELAY),
    }
  }

  // ---------- row-level writes (other days, recurring series) ----------

  // Read-modify-write of one of the user's day rows, queued with every other write
  async function mutateRow(day: string, mutate: (row: StoredRow) => StoredRow) {
    if (!userId) return
    const { data, error } = await supabase
      .from('planner_days')
      .select('tasks, completed_task_ids, morning, reflection, mood')
      .eq('day', day)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error

    const next = mutate({
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      completed_task_ids: data?.completed_task_ids ?? [],
      morning: data?.morning ?? '',
      reflection: data?.reflection ?? '',
      mood: data?.mood ?? '',
    })

    const { error: upsertError } = await supabase.from('planner_days').upsert({
      day,
      user_id: userId,
      ...next,
      visibility: 'private',
    }, { onConflict: 'user_id,day' })
    if (upsertError) throw upsertError
  }

  // Applies `change` to the stored series (null removes it). If an older app
  // version lost the source copy, the series is re-created in its source row.
  async function mutateSeries(series: PlannerTask, change: (t: PlannerTask) => PlannerTask | null) {
    const sourceDay = series.source_day ?? dateKey
    await mutateRow(sourceDay, (row) => {
      const stored = row.tasks.find(t => t.id === series.id)
      const updated = change({ ...(stored ?? series), source_day: sourceDay })
      const others = row.tasks.filter(t => t.id !== series.id)
      return { ...row, tasks: updated ? [...others, updated] : others }
    })
  }

  async function deleteSeriesEverywhere(taskId: string) {
    if (!userId) return
    const rows = await fetchRecurringRows(supabase, [userId], '9999-12-31')
    for (const row of rows) {
      if (!row.tasks?.some(t => t.id === taskId)) continue
      const { error } = await supabase
        .from('planner_days')
        .update({ tasks: row.tasks.filter(t => t.id !== taskId) })
        .eq('day', row.day)
        .eq('user_id', userId)
      if (error) throw error
    }
  }

  // Move the "done" mark from a series occurrence to the one-off that replaced it
  function swapCompletion(ids: string[], fromId: string, toId: string) {
    return ids.includes(fromId) ? [...ids.filter(id => id !== fromId), toId] : ids
  }

  // ---------- actions ----------

  function toggleComplete(taskId: string) {
    const updatedIds = completedTaskIds.includes(taskId)
      ? completedTaskIds.filter(id => id !== taskId)
      : [...completedTaskIds, taskId]
    setCompletedTaskIds(updatedIds)
    saveNow({ completedTaskIds: updatedIds })
  }

  function closeModal() {
    setTaskModalHour(null)
    setEditingTask(null)
    setSchedulingForDate(null)
    setModalStart(null)
    setSchedulingTodo(null)
  }

  function openNewTask(startMinutes?: number) {
    const start = startMinutes ?? new Date().getHours() * 60
    setModalStart(startMinutes ?? null)
    setTaskModalHour(Math.floor(start / 60))
  }

  // Opens the editor for a to-do at the next free hour (from now if today)
  function scheduleTodo(todo: PlannerTodo) {
    const now = new Date()
    const from = dateKey === todayKey ? now.getHours() * 60 + now.getMinutes() : 9 * 60
    const slot = nextFreeSlot(tasks, from) ?? Math.ceil(from / 15) * 15
    setSchedulingTodo(todo)
    openNewTask(Math.min(slot, 23 * 60))
  }

  async function completeScheduledTodo(todo: PlannerTodo | null) {
    if (!todo) return
    const { error } = await supabase.from('planner_todos').delete().eq('id', todo.id)
    if (error) console.error('Failed to remove scheduled to-do', error)
    setTodoRefresh(n => n + 1)
  }

  function applyTemplate(items: TemplateTask[], source: string) {
    setShowTemplates(false)
    if (!userId || items.length === 0) return
    const created: PlannerTask[] = items.map(t => ({ ...t, id: crypto.randomUUID(), completed: false, owner_id: userId }))
    const ids = new Set(created.map(t => t.id))
    const updated = [...tasks, ...created]
    setTasks(updated)
    saveNow({ tasks: updated })
    toast.success(`Added ${created.length} event${created.length !== 1 ? 's' : ''} from ${source}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const s = stateRef.current
          if (s.loadedDateKey !== s.dateKey) return
          const restored = s.tasks.filter(t => !ids.has(t.id))
          setTasks(restored)
          saveNow({ tasks: restored })
        },
      },
    })
  }

  async function handleSave(task: PlannerTask, scope: SaveScope) {
    const original = editingTask
    const targetDay = schedulingForDate
    const todo = schedulingTodo
    closeModal()
    if (!userId) return
    task.owner_id = task.owner_id || userId

    // New task
    if (!original) {
      if (targetDay && targetDay !== dateKey) {
        if (task.recurring) task.source_day = targetDay
        flushPendingSave()
        const ok = await enqueue(
          () => mutateRow(targetDay, row => ({ ...row, tasks: [...row.tasks, task] })).then(() => true),
          "Couldn't schedule the event.",
        )
        if (ok) {
          toast.success(`Event scheduled for ${formatDateKey(targetDay)}`)
          completeScheduledTodo(todo)
        }
        if (view === 'monthly') loadTaskDays(selectedDate.getFullYear(), selectedDate.getMonth())
        return
      }
      if (task.recurring) task.source_day = dateKey
      const updated = [...tasks, task]
      setTasks(updated)
      saveNow({ tasks: updated })
      completeScheduledTodo(todo)
      return
    }

    // One-off task (possibly turned into a recurring one starting today)
    if (!original.recurring) {
      if (task.recurring) task.source_day = dateKey
      const updated = tasks.map(t => (t.id === task.id ? task : t))
      setTasks(updated)
      saveNow({ tasks: updated })
      return
    }

    // Recurring task
    const sourceDay = original.source_day ?? dateKey
    flushPendingSave()

    if (scope === 'this') {
      const detached: PlannerTask = { ...task, id: crypto.randomUUID(), recurring: undefined, source_day: undefined }
      await enqueue(async () => {
        await mutateSeries(original, t => withException(t, dateKey))
        await mutateRow(dateKey, row => ({
          ...row,
          tasks: [...row.tasks, detached],
          completed_task_ids: swapCompletion(row.completed_task_ids, original.id, detached.id),
        }))
      }, "Couldn't update the event.")
    } else if (task.recurring) {
      await enqueue(
        () => mutateSeries(original, () => ({ ...task, source_day: sourceDay })),
        "Couldn't update the recurring event.",
      )
    } else if (dateKey > sourceDay) {
      // Repeat turned off: keep past occurrences, end the series yesterday, keep today as a one-off
      const oneOff: PlannerTask = { ...task, id: crypto.randomUUID(), source_day: undefined }
      await enqueue(async () => {
        await mutateSeries(original, t => ({ ...t, recurring: { ...t.recurring!, until: addDays(dateKey, -1) } }))
        await mutateRow(dateKey, row => ({
          ...row,
          tasks: [...row.tasks, oneOff],
          completed_task_ids: swapCompletion(row.completed_task_ids, original.id, oneOff.id),
        }))
      }, "Couldn't update the event.")
    } else {
      await enqueue(
        () => mutateSeries(original, () => ({ ...task, recurring: undefined, source_day: undefined })),
        "Couldn't update the event.",
      )
    }
    await loadDay()
  }

  async function handleDelete(task: PlannerTask, scope: SaveScope) {
    closeModal()

    if (!task.recurring) {
      const updated = tasks.filter(t => t.id !== task.id)
      const day = dateKey
      setTasks(updated)
      saveNow({ tasks: updated })
      toast.success('Event deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const s = stateRef.current
            if (s.dateKey === day && s.loadedDateKey === day) {
              const restored = [...s.tasks, task]
              setTasks(restored)
              saveNow({ tasks: restored })
            } else {
              await enqueue(() => mutateRow(day, row => ({ ...row, tasks: [...row.tasks, task] })), "Couldn't restore the event.")
            }
          },
        },
      })
      return
    }

    flushPendingSave()
    if (scope === 'this') {
      await enqueue(() => mutateSeries(task, t => withException(t, dateKey)), "Couldn't delete the event.")
      toast.success('Event removed from this day')
    } else {
      await enqueue(() => deleteSeriesEverywhere(task.id), "Couldn't delete the recurring event.")
      toast.success('All recurring events deleted')
    }
    await loadDay()
  }

  const unfinishedOneOffs = tasks.filter(t =>
    !t.recurring && (!t.owner_id || t.owner_id === userId) && !completedTaskIds.includes(t.id),
  )

  async function moveUnfinishedToTomorrow() {
    const moving = unfinishedOneOffs
    if (moving.length === 0) return
    const tomorrow = addDays(dateKey, 1)
    const movingIds = new Set(moving.map(t => t.id))
    const remaining = tasks.filter(t => !movingIds.has(t.id))

    flushPendingSave()
    const ok = await enqueue(
      () => mutateRow(tomorrow, row => ({
        ...row,
        tasks: [...row.tasks.filter(t => !movingIds.has(t.id)), ...moving],
      })).then(() => true),
      "Couldn't move the events.",
    )
    if (!ok) return
    setTasks(remaining)
    saveNow({ tasks: remaining })
    toast.success(`${moving.length} event${moving.length !== 1 ? 's' : ''} moved to ${formatDateKey(tomorrow)}`)
  }

  const sortedTasks = sortByStart(tasks)
  const isToday = dateKey === todayKey

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${theme.bg} font-sans pb-32`}>
      <header className={`sticky top-0 transition-colors duration-1000 z-30 px-6 pt-12 pb-4 ${theme.bg} backdrop-blur-md`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className={`text-3xl font-light uppercase tracking-[0.2em] opacity-40 ${theme.text}`}>{selectedDate.toLocaleString('default', { month: 'short' })}</h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold tracking-tighter ${theme.text}`}>{selectedDate.getDate()}</span>
              <span className={`text-lg font-semibold uppercase opacity-40 ${theme.text}`}>{selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/protected/analytics" className="transition-transform active:scale-90">
              <BarChart3 className={`w-7 h-7 ${theme.text} opacity-80`} />
            </Link>

            <button
              onClick={() => setView(v => v === 'monthly' ? 'daily' : 'monthly')}
              className={`relative transition-transform active:scale-90 ${view === 'monthly' ? 'scale-110' : ''}`}
            >
              <CalendarIcon className={`w-7 h-7 ${theme.text} ${view === 'monthly' ? 'opacity-100' : 'opacity-80'}`} />
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${theme.text}`}>{new Date().getDate()}</span>
            </button>
          </div>
        </div>
      </header>

      {view === 'monthly' ? (
        <MonthCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onClose={() => setView('daily')}
          onAddEvent={() => setTaskModalHour(new Date().getHours())}
          taskDays={taskDays}
          onMonthChange={loadTaskDays}
          tasks={loading ? [] : tasks}
          completedTaskIds={completedTaskIds}
          visionsMap={visionsMap}
        />
      ) : (
        <>
      <div className="px-4 py-2 mt-4">
        <TopCalendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="mt-8 px-6">
        <MoodPicker
          currentMood={mood}
          onMoodSelect={(newMood) => {
            if (loading) return
            setMood(newMood)
            saveNow({ mood: newMood })
          }}
        />

        <div className="space-y-3 mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-[32px] p-6 border border-white/50 dark:border-slate-700/50 shadow-sm">
            <DaySummary tasks={tasks} completedTaskIds={completedTaskIds} visions={visionsMap} />
          </div>
          <div className="flex justify-start px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
          </div>
        </div>

        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Morning Intention</span>
              </div>
              <textarea
                value={morning}
                disabled={loading}
                placeholder="Focus of the day..."
                onChange={(e) => { setMorning(e.target.value); saveDebounced({ morning: e.target.value }) }}
                onBlur={flushPendingSave}
                className="w-full bg-transparent border-none text-white text-[16px] font-semibold placeholder:text-white/40 focus:ring-0 resize-none outline-none min-h-[70px] disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-50 ${theme.text}`}>
            {isToday ? 'Today’s Schedule' : 'Schedule'}
          </span>
          <div className="flex items-center gap-3">
            {!loading && tasks.length > 0 && (
              <span className={`text-[10px] font-semibold opacity-40 ${theme.text}`}>
                {tasks.length} event{tasks.length !== 1 ? 's' : ''}
              </span>
            )}
            <div className="flex rounded-xl bg-white/60 dark:bg-slate-800/60 p-0.5 border border-white/50 dark:border-slate-700/50">
              {([['list', List, 'List'], ['timeline', Clock3, 'Timeline']] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  onClick={() => chooseLayout(value)}
                  aria-label={`${label} view`}
                  aria-pressed={layout === value}
                  className={`p-1.5 rounded-lg transition-all ${layout === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 relative mb-8">
          {loadError ? (
            <div className="rounded-3xl border-2 border-dashed border-red-200 dark:border-red-900/50 p-6 text-center">
              <p className={`text-sm font-semibold opacity-70 ${theme.text}`}>Couldn&apos;t load this day</p>
              <button onClick={loadDay} className="mt-3 px-4 py-2 rounded-2xl bg-violet-600 text-white text-xs font-bold active:scale-95">
                Try again
              </button>
            </div>
          ) : loading ? (
            <>
              <div className="h-20 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-3xl bg-slate-200/40 dark:bg-slate-800/40 animate-pulse" />
            </>
          ) : layout === 'timeline' ? (
            <PlannerTimeline
              tasks={tasks}
              completedTaskIds={completedTaskIds}
              partnerCompletedIds={partnerCompletedIds}
              userId={userId}
              isToday={isToday}
              onTaskClick={setEditingTask}
              onToggleComplete={toggleComplete}
              onAddAt={openNewTask}
            />
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <p className={`text-sm font-semibold opacity-60 ${theme.text}`}>Nothing planned yet</p>
              <p className={`text-xs opacity-40 mt-1 ${theme.text}`}>Add an event to start shaping your day.</p>
            </div>
          ) : sortedTasks.map((task) => {
            const isPartnerTask = !!task.owner_id && task.owner_id !== userId
            const isDone = isPartnerTask ? partnerCompletedIds.includes(task.id) : completedTaskIds.includes(task.id)
            const vision = task.vision_id ? visionsMap[task.vision_id] : null
            const partner = isPartnerTask ? profilesMap[task.owner_id!] : null

            return (
              <div
                key={task.id}
                onClick={() => !isPartnerTask && setEditingTask(task)}
                className={`relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br ${gradientFor(task)} ${isDone ? 'opacity-60' : ''} ${!isPartnerTask ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'} transition-all shadow-sm`}
              >
                {/* Decorative circle */}
                <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

                <div className="relative z-10">
                  {/* Time + completion row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest tabular-nums">
                        {task.start} — {task.end}{endsNextDay(task) && ' (+1)'}
                      </span>
                      {task.recurring && <RefreshCw className="w-3 h-3 text-white/40" />}
                    </div>
                    {isPartnerTask ? (
                      isDone && (
                        <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                          <Check className="w-3 h-3 text-slate-600 stroke-[3]" />
                        </div>
                      )
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id) }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-white border-white' : 'border-white/50 hover:border-white'}`}
                      >
                        {isDone && <Check className="w-3 h-3 text-slate-600 stroke-[3]" />}
                      </button>
                    )}
                  </div>

                  {/* Task title */}
                  <h3 className={`text-base font-black text-white leading-snug ${isDone ? 'line-through' : ''}`}>
                    {task.text}
                  </h3>

                  {/* Vision badge */}
                  {vision && (
                    <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                      <span className="text-[10px]">{vision.emoji}</span>
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{vision.title}</span>
                    </div>
                  )}

                  {/* Partner badge */}
                  {partner && (
                    <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                      {partner.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={partner.name || 'Partner'}
                          className="w-3.5 h-3.5 rounded-full"
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center text-[7px] font-bold text-white">
                          {(partner.name || 'P')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">
                        {partner.name || 'Partner'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!loading && dateKey <= todayKey && unfinishedOneOffs.length > 0 && (
          <button
            onClick={moveUnfinishedToTomorrow}
            className={`w-full mb-3 py-3 px-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 text-[13px] font-semibold flex justify-between items-center active:scale-[0.98] transition-all ${theme.text} opacity-80`}
          >
            Move {unfinishedOneOffs.length} unfinished to tomorrow
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <div className="mb-3">
          <PlannerTodos
            userId={userId}
            visions={visionsMap}
            refreshKey={todoRefresh}
            onSchedule={scheduleTodo}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => openNewTask()}
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 px-6 rounded-3xl font-bold text-[15px] flex justify-between items-center active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            Add event on {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            <Plus className="w-5 h-5" />
          </button>

          {/* Hidden native date picker for advance scheduling */}
          <input
            ref={advanceDateRef}
            type="date"
            className="sr-only"
            onChange={(e) => {
              if (e.target.value) {
                setSchedulingForDate(e.target.value)
                setTaskModalHour(new Date().getHours())
                // Reset input so the same date can be picked again
                e.target.value = ''
              }
            }}
          />

          <button
            onClick={() => advanceDateRef.current?.showPicker()}
            className="w-full border-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 py-3 px-6 rounded-3xl font-semibold text-[14px] flex justify-between items-center active:scale-[0.98] transition-all"
          >
            Schedule for another day
            <CalendarIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            disabled={loading || !userId}
            className="w-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 px-6 rounded-3xl font-semibold text-[14px] flex justify-between items-center active:scale-[0.98] transition-all disabled:opacity-60"
          >
            Copy a day or use a template
            <LayoutTemplate className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Evening Reflection</span>
              </div>
              <textarea
                value={reflection}
                disabled={loading}
                placeholder="How did you finish your day?"
                onChange={(e) => { setReflection(e.target.value); saveDebounced({ reflection: e.target.value }) }}
                onBlur={flushPendingSave}
                className="w-full bg-transparent border-none text-white text-[16px] font-semibold placeholder:text-white/40 focus:ring-0 resize-none outline-none min-h-[100px] disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      <button
        onClick={() => setTaskModalHour(new Date().getHours())}
        disabled={loading}
        className="fixed bottom-[100px] right-6 w-16 h-16 bg-white dark:bg-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-50 dark:border-slate-700 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 disabled:opacity-60"
      >
        <Plus className="w-9 h-9 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
      </button>

      {(taskModalHour !== null || editingTask) && (
        <TaskModal
          hour={editingTask ? parseInt(editingTask.start.split(':')[0]) : taskModalHour!}
          startMinutes={editingTask ? undefined : modalStart ?? undefined}
          initialText={schedulingTodo?.text}
          initialVisionId={schedulingTodo?.vision_id}
          existingTask={editingTask}
          userId={userId}
          dayTasks={schedulingForDate && schedulingForDate !== dateKey ? [] : tasks}
          dayLabel={schedulingForDate ? formatDateKey(schedulingForDate) : formatDateKey(dateKey)}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={editingTask ? (scope) => handleDelete(editingTask, scope) : undefined}
        />
      )}

      {showTemplates && userId && (
        <PlannerTemplates
          userId={userId}
          dateKey={dateKey}
          dayLabel={formatDateKey(dateKey)}
          dayTasks={tasks}
          onApply={applyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
