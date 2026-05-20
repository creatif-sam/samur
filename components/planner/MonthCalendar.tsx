'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, Check } from 'lucide-react'
import type { PlannerTask } from './DailyPlanner'

type Vision = { id: string; title: string; emoji: string }

interface MonthCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClose: () => void
  taskDays?: Set<string>
  onMonthChange?: (year: number, month: number) => void
  tasks?: PlannerTask[]
  completedTaskIds?: string[]
  visionsMap?: Record<string, Vision>
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function MonthCalendar({
  selectedDate,
  onDateSelect,
  onClose,
  taskDays = new Set(),
  onMonthChange,
  tasks = [],
  completedTaskIds = [],
  visionsMap = {},
}: MonthCalendarProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const today = new Date()

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    let startOffset = firstDay.getDay() - 1 // Mon-based: Mon=0 … Sun=6
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const d = i - startOffset + 1
      if (d < 1 || d > daysInMonth) return null
      return new Date(viewYear, viewMonth, d)
    })
  }, [viewYear, viewMonth])

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  function sameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  function navigate(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
    onMonthChange?.(y, m)
  }

  function jumpToToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    onMonthChange?.(today.getFullYear(), today.getMonth())
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const isViewingToday =
    viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div className="px-5 pt-4 pb-8">
      {/* Month header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl bg-white/50 dark:bg-slate-800/50 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-2xl bg-white/50 dark:bg-slate-800/50 active:scale-90 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div
            key={d}
            className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="aspect-square" />

          const isToday = sameDay(day, today)
          const isSelected = sameDay(day, selectedDate)
          const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
          const hasTasks = taskDays.has(dateKey)

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center justify-center aspect-square rounded-2xl text-[13px] font-bold transition-all active:scale-90
                ${isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : isToday
                  ? 'ring-2 ring-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }
              `}
            >
              <span>{day.getDate()}</span>
              {hasTasks && (
                <div
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white/60' : 'bg-violet-500'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Jump to today */}
      {!isViewingToday && (
        <button
          onClick={jumpToToday}
          className="mt-4 w-full text-[12px] font-bold text-violet-500 dark:text-violet-400 py-2 active:opacity-70 transition-all"
        >
          Jump to today
        </button>
      )}

      {/* Day plan panel */}
      <div className={`border-t border-slate-200/60 dark:border-slate-700/60 ${!isViewingToday ? 'mt-2 pt-5' : 'mt-6 pt-5'}`}>
        {/* Day header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              {sameDay(selectedDate, today) ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                {selectedDate.getDate()}
              </span>
              <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">
                {tasks.length} event{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-bold px-3.5 py-2 rounded-2xl active:scale-90 transition-all shadow-sm"
          >
            Open plan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <p className="text-center text-[13px] text-slate-400 dark:text-slate-500 py-6 font-medium">
            No events scheduled
          </p>
        ) : (
          <div className="space-y-2 pb-4">
            {[...tasks]
              .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
              .map((task) => {
                const isDone = completedTaskIds.includes(task.id)
                const vision = task.vision_id ? visionsMap[task.vision_id] : null
                return (
                  <div
                    key={task.id}
                    className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                        {task.start} — {task.end}
                      </p>
                      <p className={`text-[14px] font-bold text-slate-900 dark:text-white truncate ${isDone ? 'line-through opacity-40' : ''}`}>
                        {task.text}
                      </p>
                      {vision && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px]">{vision.emoji}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{vision.title}</span>
                        </div>
                      )}
                    </div>
                    {isDone && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
