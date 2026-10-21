'use client'

import { useEffect, useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'
import { TaskBasics } from './TaskBasics'
import { TaskRecurrence } from './TaskRecurrence'
import { Modal } from './Modal'
import { Clock, ArrowRight, X, Calendar as CalendarIcon, Trash2, Eye, EyeOff, AlertTriangle, Bell } from 'lucide-react'
import { DEFAULT_REMINDER_MINUTES, REMINDER_OPTIONS, endsNextDay, overlapping, reminderMinutes, taskDuration } from '@/lib/planner/tasks'

export type SaveScope = 'this' | 'all'

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function sameRule(a: PlannerTask['recurring'] | null | undefined, b: PlannerTask['recurring'] | null | undefined) {
  if (!a || !b) return !a && !b
  return a.interval === b.interval &&
    a.unit === b.unit &&
    (a.until || '') === (b.until || '') &&
    [...a.daysOfWeek].sort().join() === [...b.daysOfWeek].sort().join()
}

export function TaskModal({
  hour,
  startMinutes,
  initialText,
  initialVisionId,
  existingTask,
  userId,
  dayTasks = [],
  dayLabel,
  onClose,
  onSave,
  onDelete,
}: {
  hour: number
  startMinutes?: number // Exact start for new tasks (e.g. a free gap); overrides `hour`
  initialText?: string // Pre-filled title for new tasks (e.g. scheduling a to-do)
  initialVisionId?: string | null
  existingTask?: PlannerTask | null
  userId: string | null
  dayTasks?: PlannerTask[]
  dayLabel?: string
  onClose: () => void
  onSave: (t: PlannerTask, scope: SaveScope) => void
  onDelete?: (scope: SaveScope) => void
}) {
  const [text, setText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [visionId, setVisionId] = useState<string | null>(null)
  const [recurring, setRecurring] = useState<PlannerTask['recurring'] | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private')
  const [reminder, setReminder] = useState<number | null>(DEFAULT_REMINDER_MINUTES)
  const [confirm, setConfirm] = useState<'save' | 'delete' | null>(null)

  // Determine if user can edit this task
  const canEdit = !existingTask || !existingTask.owner_id || existingTask.owner_id === userId
  const isRecurring = !!existingTask?.recurring

  useEffect(() => {
    if (existingTask) {
      setText(existingTask.text)
      setStartTime(existingTask.start)
      setEndTime(existingTask.end)
      setVisionId(existingTask.vision_id ?? null)
      setRecurring(existingTask.recurring ?? null)
      setVisibility(existingTask.visibility || 'private')
      setReminder(reminderMinutes(existingTask))
    } else {
      const start = startMinutes ?? hour * 60
      setStartTime(formatTime(start))
      setEndTime(formatTime(start + 60))
      setVisibility('private')
      if (initialText) setText(initialText)
      if (initialVisionId) setVisionId(initialVisionId)
    }
  }, [existingTask, hour, startMinutes, initialText, initialVisionId])

  const timesValid = !!startTime && !!endTime && startTime !== endTime
  const canSave = canEdit && text.trim().length > 0 && timesValid
  const clashes = timesValid
    ? overlapping({ id: existingTask?.id ?? '', start: startTime, end: endTime }, dayTasks)
    : []

  function buildTask(): PlannerTask {
    return {
      id: existingTask?.id ?? crypto.randomUUID(),
      text: text.trim(),
      start: startTime,
      end: endTime,
      completed: existingTask?.completed ?? false,
      vision_id: visionId ?? undefined,
      recurring: recurring ?? undefined,
      visibility,
      owner_id: existingTask?.owner_id ?? userId ?? undefined,
      source_day: existingTask?.source_day,
      reminder,
    }
  }

  function handleSave() {
    if (!canSave) return
    // Changing the repeat rule (or turning it off) always applies to the whole series
    if (isRecurring && recurring && sameRule(recurring, existingTask!.recurring)) {
      setConfirm('save')
      return
    }
    onSave(buildTask(), 'all')
  }

  function handleDelete() {
    if (isRecurring) {
      setConfirm('delete')
      return
    }
    onDelete?.('all')
  }

  function chooseScope(scope: SaveScope) {
    if (confirm === 'save') onSave(buildTask(), scope)
    else if (confirm === 'delete') onDelete?.(scope)
    setConfirm(null)
  }

  function getDurationLabel() {
    if (!timesValid) return '—'
    const diff = taskDuration({ start: startTime, end: endTime })
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
  }

  const overnight = timesValid && endsNextDay({ start: startTime, end: endTime })

  return (
    <Modal onClose={onClose}>
      {/* Container: max-w-4xl for PC, w-[95vw] for mobile to prevent overflow */}
      <div className="w-[95vw] md:w-full md:max-w-4xl bg-white dark:bg-slate-900 rounded-[28px] md:rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mx-auto">

        {/* Header */}
        <div className="px-5 md:px-8 pt-6 md:pt-8 pb-4 flex justify-between items-start border-b border-slate-50 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              placeholder="What's happening?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              disabled={!canEdit}
              className="w-full text-xl md:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 dark:text-white truncate disabled:opacity-60"
            />
            <p className="text-[9px] md:text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-1">
              {existingTask ? (canEdit ? 'Modify Schedule' : 'View Schedule') : 'New Plan'}
              {dayLabel && <span className="text-slate-400"> · {dayLabel}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full ml-2">
            <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 max-h-[60dvh] overflow-y-auto">

          {/* LEFT COLUMN: Time & Vision */}
          <div className="space-y-6 md:space-y-8">
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> Timeline
                </label>
                <span className="text-[9px] md:text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                  {getDurationLabel()}{overnight && ' · ends next day'}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value
                      if (!newStart) return
                      // Keep the same duration when the start moves
                      const duration = timesValid ? taskDuration({ start: startTime, end: endTime }) : 60
                      const [h, m] = newStart.split(':').map(Number)
                      setStartTime(newStart)
                      setEndTime(formatTime(h * 60 + m + duration))
                    }}
                    disabled={!canEdit}
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <ArrowRight className="text-slate-300 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => { if (e.target.value) setEndTime(e.target.value) }}
                    disabled={!canEdit}
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {startTime && startTime === endTime && (
                <p className="text-[11px] text-red-500 font-semibold mt-2">Start and end can&apos;t be the same time.</p>
              )}

              {canEdit && clashes.length > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 px-3 py-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-snug">
                    Overlaps with {clashes.slice(0, 2).map(c => `“${c.text}” (${c.start}–${c.end})`).join(', ')}
                    {clashes.length > 2 && ` and ${clashes.length - 2} more`}
                  </p>
                </div>
              )}
            </div>

            {canEdit && (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-slate-100 dark:border-slate-700">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Bell size={12} /> Reminder
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REMINDER_OPTIONS.map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setReminder(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        reminder === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <TaskBasics
              text={text}
              visionId={visionId}
              onTextChange={setText}
              onVisionChange={setVisionId}
              hideTitle={true}
            />

            {/* Visibility Toggle */}
            {canEdit && (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-slate-100 dark:border-slate-700">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  Task Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      visibility === 'private'
                        ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <EyeOff className="w-4 h-4 inline mr-1" />
                    Private
                  </button>
                  <button
                    onClick={() => setVisibility('shared')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      visibility === 'shared'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Shared
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {visibility === 'shared' ? 'Your partner can see this task' : 'Only you can see this task'}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Recurrence */}
          <div className="lg:border-l lg:pl-10 lg:border-slate-100 lg:dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <CalendarIcon size={12} /> Recurrence Rules
            </div>
            <TaskRecurrence
              value={recurring}
              onChange={setRecurring}
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50 dark:bg-slate-800/20 flex flex-row flex-wrap gap-3 justify-between items-center">
          {!canEdit ? (
            <>
              <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 italic">
                You can only view this task
              </div>
              <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white">
                Close
              </button>
            </>
          ) : confirm ? (
            <>
              <p className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                {confirm === 'delete' ? 'Delete which events?' : 'Apply changes to?'}
              </p>
              <div className="flex gap-2 shrink-0 ml-auto">
                <button onClick={() => setConfirm(null)} className="px-3 py-2 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
                  Back
                </button>
                <button
                  onClick={() => chooseScope('this')}
                  className="px-3 md:px-5 py-2 md:py-3 rounded-xl text-xs md:text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                >
                  This event
                </button>
                <button
                  onClick={() => chooseScope('all')}
                  className={`px-3 md:px-5 py-2 md:py-3 rounded-xl text-xs md:text-sm font-bold text-white ${confirm === 'delete' ? 'bg-red-500' : 'bg-blue-600'}`}
                >
                  All events
                </button>
              </div>
            </>
          ) : (
            <>
              {existingTask && onDelete ? (
                <button
                  onClick={handleDelete}
                  className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              ) : (
                <button onClick={onClose} className="px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
                  Discard
                </button>
              )}

              <div className="flex gap-3">
                {existingTask && (
                  <button onClick={onClose} className="px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`flex-1 md:flex-none md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg transition-all ${canSave ? 'bg-blue-600 text-white active:scale-95 shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {existingTask ? 'Save Changes' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
