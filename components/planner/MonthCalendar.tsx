'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react'

interface MonthCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClose: () => void
  taskDays?: Set<string>
  onMonthChange?: (year: number, month: number) => void
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function MonthCalendar({
  selectedDate,
  onDateSelect,
  onClose,
  taskDays = new Set(),
  onMonthChange,
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
              onClick={() => { onDateSelect(day); onClose() }}
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

      {/* Back to daily plan */}
      <button
        onClick={onClose}
        className={`w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 rounded-3xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm ${!isViewingToday ? 'mt-2' : 'mt-6'}`}
      >
        <LayoutList className="w-4 h-4" />
        View {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} Plan
      </button>
    </div>
  )
}
