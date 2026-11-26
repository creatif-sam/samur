'use client'

import { appLocale, trNow } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar as CalendarIcon, BarChart3, Sun, Moon, ArrowRight, List, Clock3, LayoutTemplate, Zap } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MonthCalendar from './MonthCalendar'

import { TaskModal, type SaveScope } from './tasks/TaskModal'
import TopCalendar from './TopCalendar'
import DaySummary from './DailySummary'
import FreeTimeExportButton from './FreeTimeExportButton'
import MoodPicker, { moodThemes } from './MoodPicker'
import type { RoleLike } from '@/lib/planner/roleLinks'
import { isMissingRoles, loadRocks, loadRoles, sortRoles, weekStart, type WeeklyRock } from '@/lib/roles'
import PlannerTimeline from './PlannerTimeline'
import DayTaskCards from './DayTaskCards'
import NoteCard from './NoteCard'
import RocksStrip from './RocksStrip'
import TopThree, { type PrioritySuggestion } from './TopThree'
import WeekPlanner from './WeekPlanner'
import { loadWeek, unscheduledRocks, type WeekDay } from '@/lib/planner/week'
import { parseQuickAdd } from '@/lib/planner/quickAdd'
import { addPriority, loadPriorities, removePriority, savePriorities, type Priority } from '@/lib/planner/top3'
import PlannerTodos, { type PlannerTodo } from './PlannerTodos'
import PlannerTemplates, { type TemplateTask } from './PlannerTemplates'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { fetchDayRows, fetchRecurringRows } from '@/lib/planner/queries'
import { dequeueDay, isNetworkError, queueDay, queuedDay, queuedDays, type QueuedDay } from '@/lib/planner/offline'
import {
  buildDayTasks,
  formatMinutes,
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
  return parseDateKey(key).toLocaleDateString(appLocale() ?? 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function withException(task: PlannerTask, dateKey: string): PlannerTask {
  if (!task.recurring) return task
  const exceptions = new Set(task.recurring.exceptions ?? [])
  exceptions.add(dateKey)
  return { ...task, recurring: { ...task.recurring, exceptions: Array.from(exceptions).sort() } }
}

export default function DailyPlanner() {
  const { tr } = useTranslation()
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
  // Every role (archived ones too, so past events keep their colour); only active ones are offered
  const [rolesMap, setRolesMap] = useState<Record<string, RoleLike>>({})
  const [goalTitles, setGoalTitles] = useState<Record<string, string>>({})
  const activeRoles = useMemo(() => sortRoles(Object.values(rolesMap).filter(r => !r.is_archived) as (RoleLike & { sort_order: number; created_at?: string })[]), [rolesMap])
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({})
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  // This week's big rocks and the week's events (to know which rocks have time booked)
  const [rocks, setRocks] = useState<WeeklyRock[]>([])
  const [rocksReady, setRocksReady] = useState(false)
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [schedulingRock, setSchedulingRock] = useState<WeeklyRock | null>(null)
  // Top 3 for the day on screen
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [prioritiesFor, setPrioritiesFor] = useState<string | null>(null)
  const prioritiesSynced = useRef(true)
  const prioritiesChain = useRef<Promise<unknown>>(Promise.resolve())
  const [quickText, setQuickText] = useState('')
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
  const week = weekStart(dateKey)

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

  // The week's rocks and events, refreshed after planner saves (debounced: text saves fire it too)
  useEffect(() => {
    if (!userId) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const [weekRocks, days] = await Promise.all([
          loadRocks(supabase, userId, week).then(r => ({ r, ok: true }), err => {
            if (isMissingRoles(err?.message)) return { r: [] as WeeklyRock[], ok: false }
            throw err
          }),
          loadWeek(supabase, userId, week),
        ])
        if (!live) return
        setRocks(weekRocks.r)
        setRocksReady(weekRocks.ok)
        setWeekData(days)
      } catch (err) {
        console.error('Failed to load the week', err)
      }
    }
    const onChanged = () => { clearTimeout(timer); timer = setTimeout(load, 800) }
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('planner:changed', onChanged)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      clearTimeout(timer)
      window.removeEventListener('planner:changed', onChanged)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, week]) // eslint-disable-line react-hooks/exhaustive-deps

  // Top 3 of the day on screen
  useEffect(() => {
    if (!userId) return
    let live = true
    setPrioritiesFor(null)
    loadPriorities(supabase, userId, dateKey)
      .then(({ items, synced }) => {
        if (!live) return
        prioritiesSynced.current = synced
        setPriorities(items)
        setPrioritiesFor(dateKey)
      })
      .catch(err => {
        console.error('Failed to load top 3', err)
        if (live) { setPriorities([]); setPrioritiesFor(dateKey) }
      })
    return () => { live = false }
  }, [userId, dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush a pending text save when switching day, leaving the page or backgrounding the app
  useEffect(() => () => flushPendingSave(), [dateKey])
  useEffect(() => {
    const onOnline = () => { enqueue(flushOutbox, trNow("Couldn't sync offline changes.")).then(() => loadDay()) }
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

    const [{ data: profile }, { data: visions }, rolesRes, { data: goalRows }] = await Promise.all([
      supabase.from('profiles').select('partner_id').eq('id', uid).single(),
      supabase.from('visions').select('id, title, emoji').eq('owner_id', uid),
      // Works before the roles update too: then there are simply no roles to offer
      loadRoles(supabase, uid),
      supabase.from('goals').select('id, title').eq('owner_id', uid),
    ])
    setRolesMap(Object.fromEntries(rolesRes.roles.map(r => [r.id, r])))
    setGoalTitles(Object.fromEntries((goalRows ?? []).map(g => [g.id as string, g.title as string])))

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
    await enqueue(flushOutbox, trNow("Couldn't sync offline changes."))

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
        toast(tr('You\'re offline. Changes are saved on this device and will sync.'), { id: 'planner-offline' })
        return
      }
      if (error) throw error
      dequeueDay(uid, row.day) // a newer save supersedes anything queued for this day
      window.dispatchEvent(new Event('planner:changed'))
    }, trNow("Couldn't save your planner. Check your connection."))
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
    if (ok) toast.success(tr('Offline changes synced'), { id: 'planner-offline' })
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
    window.dispatchEvent(new Event('planner:changed'))
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

  useEffect(() => {
    function onAlarmDone(e: Event) {
      const detail = (e as CustomEvent<{ taskId: string; day: string; handled?: boolean }>).detail
      const s = stateRef.current
      if (!detail || detail.day !== s.dateKey || s.loadedDateKey !== s.dateKey) return
      detail.handled = true
      if (!s.completedTaskIds.includes(detail.taskId)) toggleCompleteRef.current(detail.taskId)
    }
    window.addEventListener('planner:complete', onAlarmDone)
    return () => window.removeEventListener('planner:complete', onAlarmDone)
  }, [])

  function toggleComplete(taskId: string) {
    const updatedIds = completedTaskIds.includes(taskId)
      ? completedTaskIds.filter(id => id !== taskId)
      : [...completedTaskIds, taskId]
    setCompletedTaskIds(updatedIds)
    saveNow({ completedTaskIds: updatedIds })
  }
  const toggleCompleteRef = useRef(toggleComplete)
  toggleCompleteRef.current = toggleComplete

  function closeModal() {
    setTaskModalHour(null)
    setEditingTask(null)
    setSchedulingForDate(null)
    setModalStart(null)
    setSchedulingTodo(null)
    setSchedulingRock(null)
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

  // Next free start on the day on screen (from now if today), for to-dos, rocks and quick add
  function nextSlot(dayTasks: PlannerTask[], day: string, duration = 60) {
    const now = new Date()
    const from = day === todayKey ? now.getHours() * 60 + now.getMinutes() : 9 * 60
    return Math.min(nextFreeSlot(dayTasks, from, duration) ?? Math.ceil(from / 15) * 15, 23 * 60)
  }

  // Book time for a big rock: the editor opens at the next free slot with its role and goal
  function scheduleRock(rock: WeeklyRock) {
    setSchedulingRock(rock)
    openNewTask(nextSlot(tasks, dateKey))
  }

  // One line: "Gym tomorrow 7am 1h"; with no time it goes in the next free slot
  const quickParsed = useMemo(() => parseQuickAdd(quickText, todayKey, dateKey), [quickText, todayKey, dateKey])
  const quickSlot = useMemo(() => {
    if (!quickParsed) return null
    if (quickParsed.start && quickParsed.end) return { start: quickParsed.start, end: quickParsed.end }
    const dayTasks = quickParsed.day === dateKey ? tasks : weekData.find(d => d.day === quickParsed.day)?.tasks ?? []
    const start = nextSlot(dayTasks, quickParsed.day, quickParsed.duration)
    return { start: formatMinutes(start), end: formatMinutes((start + quickParsed.duration) % 1440) }
  }, [quickParsed, tasks, weekData, dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function quickAdd() {
    if (!quickParsed || !quickSlot || !userId || loading) return
    const task: PlannerTask = {
      id: crypto.randomUUID(),
      text: quickParsed.text,
      start: quickSlot.start,
      end: quickSlot.end,
      completed: false,
      visibility: 'private',
      owner_id: userId,
    }
    const day = quickParsed.day
    setQuickText('')
    handleSave(task, 'all', { original: null, targetDay: day !== dateKey ? day : null })
    if (day === dateKey) toast.success(tr('Added {text} at {time}', { text: task.text, time: task.start }))
  }

  // Dropped on the timeline: a one-off moves (with undo); a repeating event moves for this day only
  function moveTask(task: PlannerTask, next: { start: string; end: string }) {
    if (loading) return
    const moved = { ...task, ...next }
    if (task.recurring) {
      handleSave(moved, 'this', { original: task })
      toast.success(tr('Moved to {time} for this day only', { time: next.start }))
      return
    }
    handleSave(moved, 'all', { original: task })
    const day = dateKey
    toast.success(tr('Moved to {time}', { time: next.start }), {
      action: {
        label: tr('Undo'),
        onClick: () => {
          const s = stateRef.current
          if (s.dateKey !== day || s.loadedDateKey !== day) return
          const restored = s.tasks.map(t => (t.id === task.id ? { ...t, start: task.start, end: task.end } : t))
          setTasks(restored)
          saveNow({ tasks: restored })
        },
      },
    })
  }

  // Mark a big rock done (or not) in Compass, as its checkbox there does
  async function setRockDone(rockId: string, done: boolean) {
    const rock = rocks.find(r => r.id === rockId)
    if (!rock || rock.done === done || !userId) return
    const doneAt = done ? new Date().toISOString() : null
    setRocks(rs => rs.map(r => (r.id === rockId ? { ...r, done, done_at: doneAt } : r)))
    const { data, error } = await supabase.from('weekly_rocks').update({ done, done_at: doneAt }).eq('id', rockId).eq('owner_id', userId).select('id')
    if (error || !data?.length) {
      setRocks(rs => rs.map(r => (r.id === rockId ? rock : r)))
      toast.error(trNow("Couldn't update the big rock."))
    }
  }

  // Top 3 as shown: an item that is a big rock is done once the rock is done
  const rockDone = (id?: string) => !!id && !!rocks.find(r => r.id === id)?.done
  const shownPriorities = priorities.map(p => (!p.done && rockDone(p.rock_id) ? { ...p, done: true } : p))

  function toggleTopThree(id: string) {
    const item = shownPriorities.find(p => p.id === id)
    if (!item) return
    const next = !item.done
    changePriorities(priorities.map(p => (p.id === id ? { ...p, done: next } : p)))
    if (item.rock_id) setRockDone(item.rock_id, next)
  }

  // Top 3: change the list for the day on screen and save it (one save at a time)
  function changePriorities(next: Priority[]) {
    if (!userId || prioritiesFor !== dateKey || next === priorities) return
    setPriorities(next)
    const day = dateKey
    const synced = prioritiesSynced.current
    prioritiesChain.current = prioritiesChain.current
      .then(() => savePriorities(supabase, userId, day, next, synced))
      .catch(err => { console.error('Failed to save top 3', err); toast.error(trNow("Couldn't save your top 3.")) })
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
    toast.success(tr('Added {createdCount} {createdCount:event|events} from {source}', { createdCount: created.length, source: source }), {
      action: {
        label: tr('Undo'),
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

  // From the editor (defaults come from what it was opened with), or directly from
  // quick add and drag, which pass the original event and the target day themselves
  async function handleSave(
    task: PlannerTask,
    scope: SaveScope,
    ctx?: { original?: PlannerTask | null; targetDay?: string | null; todo?: PlannerTodo | null },
  ) {
    const original = ctx ? ctx.original ?? null : editingTask
    const targetDay = ctx ? ctx.targetDay ?? null : schedulingForDate
    const todo = ctx ? ctx.todo ?? null : schedulingTodo
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
          trNow("Couldn't schedule the event."),
        )
        if (ok) {
          toast.success(tr('Event scheduled for {value}', { value: formatDateKey(targetDay) }))
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
      }, trNow("Couldn't update the event."))
    } else if (task.recurring) {
      await enqueue(
        () => mutateSeries(original, () => ({ ...task, source_day: sourceDay })),
        trNow("Couldn't update the recurring event."),
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
      }, trNow("Couldn't update the event."))
    } else {
      await enqueue(
        () => mutateSeries(original, () => ({ ...task, recurring: undefined, source_day: undefined })),
        trNow("Couldn't update the event."),
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
      toast.success(tr('Event deleted'), {
        action: {
          label: tr('Undo'),
          onClick: async () => {
            const s = stateRef.current
            if (s.dateKey === day && s.loadedDateKey === day) {
              const restored = [...s.tasks, task]
              setTasks(restored)
              saveNow({ tasks: restored })
            } else {
              await enqueue(() => mutateRow(day, row => ({ ...row, tasks: [...row.tasks, task] })), trNow("Couldn't restore the event."))
            }
          },
        },
      })
      return
    }

    flushPendingSave()
    if (scope === 'this') {
      await enqueue(() => mutateSeries(task, t => withException(t, dateKey)), trNow("Couldn't delete the event."))
      toast.success(tr('Event removed from this day'))
    } else {
      await enqueue(() => deleteSeriesEverywhere(task.id), trNow("Couldn't delete the recurring event."))
      toast.success(tr('All recurring events deleted'))
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
      trNow("Couldn't move the events."),
    )
    if (!ok) return
    setTasks(remaining)
    saveNow({ tasks: remaining })
    toast.success(tr('{movingCount} {movingCount:event|events} moved to {value2}', { movingCount: moving.length, value2: formatDateKey(tomorrow) }))
  }

  const sortedTasks = sortByStart(tasks)
  const isToday = dateKey === todayKey

  // Rocks with no time yet this week (today's events come from the screen, the rest from the week)
  const weekTasks = [...weekData.filter(d => d.day !== dateKey).flatMap(d => d.tasks), ...tasks]
    .filter(t => !t.owner_id || t.owner_id === userId)
  // Like Compass: only rocks of active roles, and Sharpen the saw
  const liveRocks = rocks.filter(r => r.role_id === null || (!!rolesMap[r.role_id] && !rolesMap[r.role_id].is_archived))
  const openRocks = unscheduledRocks(liveRocks, weekTasks)
  const showRocks = rocksReady && activeRoles.length > 0

  const prioritySuggestions: PrioritySuggestion[] = [
    ...liveRocks.filter(r => !r.done).map(r => ({ key: `rock-${r.id}`, text: r.text, rock_id: r.id, hint: '⛰️' })),
    ...sortByStart(tasks.filter(t => (!t.owner_id || t.owner_id === userId) && !completedTaskIds.includes(t.id)))
      .map(t => ({ key: `task-${t.id}`, text: t.text, hint: t.start })),
  ]
  const prioritiesLoading = prioritiesFor !== dateKey

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${theme.bg} font-sans pb-32`}>
      <header className={`sticky top-0 transition-colors duration-1000 z-30 px-6 pt-12 pb-4 ${theme.bg} backdrop-blur-md`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className={`text-3xl font-light uppercase tracking-[0.2em] opacity-40 ${theme.text}`}>{selectedDate.toLocaleString(appLocale(), { month: 'short' })}</h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold tracking-tighter ${theme.text}`}>{selectedDate.getDate()}</span>
              <span className={`text-lg font-semibold uppercase opacity-40 ${theme.text}`}>{selectedDate.toLocaleDateString(appLocale() ?? 'en-US', { weekday: 'short' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/protected/analytics" className="transition-transform active:scale-90">
              <BarChart3 className={`w-7 h-7 ${theme.text} opacity-80`} />
            </Link>

            <button
              onClick={() => setView(v => v === 'monthly' ? 'daily' : 'monthly')}
              aria-label={tr('Month')}
              className={`relative transition-transform active:scale-90 ${view === 'monthly' ? 'scale-110' : ''}`}
            >
              <CalendarIcon className={`w-7 h-7 ${theme.text} ${view === 'monthly' ? 'opacity-100' : 'opacity-80'}`} />
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${theme.text}`}>{new Date().getDate()}</span>
            </button>
          </div>
        </div>
        {/* Day, week or month */}
        <div className="mt-4 flex rounded-2xl border border-white/50 bg-white/60 p-1 dark:border-slate-700/50 dark:bg-slate-800/60">
          {([['daily', 'Day'], ['weekly', 'Week'], ['monthly', 'Month']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${view === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {tr(label)}
            </button>
          ))}
        </div>
      </header>

      {view === 'weekly' ? (
        <div className="mt-4">
          <WeekPlanner
            selectedKey={dateKey}
            userId={userId}
            rolesMap={rolesMap}
            visionsMap={visionsMap}
            onPickDay={day => { setSelectedDate(parseDateKey(day)); setView('daily') }}
          />
        </div>
      ) : view === 'monthly' ? (
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
          rolesMap={rolesMap}
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
            <DaySummary tasks={tasks} completedTaskIds={completedTaskIds} roles={activeRoles} />
          </div>
          <div className="flex items-center gap-1 px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
            <HelpTip topic="planner.summary" align="left" />
          </div>
        </div>

        <div className="mb-8">
          <NoteCard
            icon={<Sun className="w-3.5 h-3.5 text-white/70" />}
            title={tr('Morning Intention')}
            help="planner.intention"
            gradient="from-amber-500 to-orange-600"
            value={morning}
            placeholder={tr('Focus of the day...')}
            minHeight="70px"
            disabled={loading}
            onChange={v => { setMorning(v); saveDebounced({ morning: v }) }}
            onBlur={flushPendingSave}
          >
            <TopThree
              mode="plan"
              items={shownPriorities}
              suggestions={prioritySuggestions}
              disabled={prioritiesLoading}
              onAdd={item => changePriorities(addPriority(priorities, item))}
              onToggle={toggleTopThree}
              onRemove={id => changePriorities(removePriority(priorities, id))}
            />
          </NoteCard>
        </div>

        {showRocks && (
          <div className="mb-8">
            <RocksStrip rocks={openRocks} total={liveRocks.length} rolesMap={rolesMap} onSchedule={scheduleRock} />
          </div>
        )}

        <div className="flex items-center justify-between mb-3 px-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-50 ${theme.text}`}>
            {isToday ? tr('Today’s Schedule') : tr('Schedule')}
          </span>
          <div className="flex items-center gap-3">
            {!loading && tasks.length > 0 && (
              <span className={`text-[10px] font-semibold opacity-40 ${theme.text}`}>
                {tr('{tasksCount} {tasksCount:event|events}', { tasksCount: tasks.length })}
              </span>
            )}
            <div className="flex rounded-xl bg-white/60 dark:bg-slate-800/60 p-0.5 border border-white/50 dark:border-slate-700/50">
              {([['list', List, 'List'], ['timeline', Clock3, 'Timeline']] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  onClick={() => chooseLayout(value)}
                  aria-label={tr('{label} view', { label: tr(label) })}
                  aria-pressed={layout === value}
                  className={`p-1.5 rounded-lg transition-all ${layout === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); quickAdd() }}
          className="mb-3"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
            <Zap className="h-4 w-4 shrink-0 text-violet-500" />
            <input
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              disabled={loading}
              maxLength={200}
              enterKeyHint="done"
              placeholder={tr('Quick add: Gym tomorrow 7am 1h')}
              aria-label={tr('Quick add')}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[16px] font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            <HelpTip topic="planner.quickadd" align="right" className="-my-1" />
            {quickParsed && (
              <button type="submit" disabled={loading} className="shrink-0 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95 disabled:opacity-60">
                {tr('Add')}
              </button>
            )}
          </div>
          {quickParsed && quickSlot && (
            <p className={`mt-1.5 px-2 text-[11px] font-semibold opacity-60 ${theme.text}`}>
              → {quickParsed.text} · {quickParsed.day === dateKey ? (isToday ? tr('Today') : formatDateKey(quickParsed.day)) : formatDateKey(quickParsed.day)} · {quickSlot.start}–{quickSlot.end}{!quickParsed.start && ` (${tr('next free slot')})`}
            </p>
          )}
        </form>

        <div className="space-y-3 relative mb-8">
          {loadError ? (
            <div className="rounded-3xl border-2 border-dashed border-red-200 dark:border-red-900/50 p-6 text-center">
              <p className={`text-sm font-semibold opacity-70 ${theme.text}`}>{tr('Couldn\'t load this day')}</p>
              <button onClick={loadDay} className="mt-3 px-4 py-2 rounded-2xl bg-violet-600 text-white text-xs font-bold active:scale-95">
                {tr('Try again')}
              </button>
            </div>
          ) : loading ? (
            <>
              <div className="h-20 rounded-3xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-3xl bg-slate-200/40 dark:bg-slate-800/40 animate-pulse" />
            </>
          ) : layout === 'timeline' ? (
            <PlannerTimeline
              rolesMap={rolesMap}
              tasks={tasks}
              completedTaskIds={completedTaskIds}
              partnerCompletedIds={partnerCompletedIds}
              userId={userId}
              isToday={isToday}
              onTaskClick={setEditingTask}
              onToggleComplete={toggleComplete}
              onAddAt={openNewTask}
              onMove={moveTask}
            />
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <p className={`text-sm font-semibold opacity-60 ${theme.text}`}>{tr('Nothing planned yet')}</p>
              <p className={`text-xs opacity-40 mt-1 ${theme.text}`}>{tr('Add an event to start shaping your day.')}</p>
            </div>
          ) : (
            <DayTaskCards
              tasks={sortedTasks}
              userId={userId}
              completedTaskIds={completedTaskIds}
              partnerCompletedIds={partnerCompletedIds}
              rolesMap={rolesMap}
              visionsMap={visionsMap}
              goalTitles={goalTitles}
              profilesMap={profilesMap}
              onOpen={setEditingTask}
              onToggle={toggleComplete}
            />
          )}
        </div>

        {!loading && dateKey <= todayKey && unfinishedOneOffs.length > 0 && (
          <button
            onClick={moveUnfinishedToTomorrow}
            className={`w-full mb-3 py-3 px-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 text-[13px] font-semibold flex justify-between items-center active:scale-[0.98] transition-all ${theme.text} opacity-80`}
          >
            {tr('Move')}{' '}{unfinishedOneOffs.length}{' '}{tr('unfinished to tomorrow')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <div className="mb-3">
          <PlannerTodos
            userId={userId}
            visions={visionsMap}
            roles={rolesMap}
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
            {tr('Add event on')}{' '}{selectedDate.toLocaleDateString(appLocale() ?? 'en-GB', { day: 'numeric', month: 'short' })}
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
            {tr('Schedule for another day')}
            <CalendarIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            disabled={loading || !userId}
            className="w-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 px-6 rounded-3xl font-semibold text-[14px] flex justify-between items-center active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {tr('Copy a day or use a template')}
            <LayoutTemplate className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 pb-20">
          <NoteCard
            icon={<Moon className="w-3.5 h-3.5 text-white/70" />}
            title={tr('Evening Reflection')}
            help="planner.reflection"
            gradient="from-violet-600 to-indigo-700"
            value={reflection}
            placeholder={tr('How did you finish your day?')}
            minHeight="100px"
            disabled={loading}
            onChange={v => { setReflection(v); saveDebounced({ reflection: v }) }}
            onBlur={flushPendingSave}
          >
            <TopThree
              mode="review"
              items={shownPriorities}
              disabled={prioritiesLoading}
              onToggle={toggleTopThree}
            />
          </NoteCard>
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
          initialText={schedulingTodo?.text ?? schedulingRock?.text}
          initialVisionId={schedulingTodo?.vision_id}
          initialRoleId={schedulingTodo?.role_id ?? schedulingRock?.role_id}
          initialGoalId={schedulingTodo?.goal_id ?? schedulingRock?.goal_id}
          initialRockId={schedulingRock?.id}
          roles={activeRoles}
          visions={visionsMap}
          existingTask={editingTask}
          userId={userId}
          dayTasks={schedulingForDate && schedulingForDate !== dateKey ? [] : tasks}
          dayLabel={schedulingForDate ? formatDateKey(schedulingForDate) : formatDateKey(dateKey)}
          onClose={closeModal}
          onSave={(t, scope) => handleSave(t, scope)}
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
