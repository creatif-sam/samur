'use client'

import { useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface TopCalendarProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export default function TopCalendar({
  selectedDate,
  onChange,
}: TopCalendarProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  const days = useMemo(() => {
    const base = new Date(selectedDate)
    const start = new Date(base)
    start.setDate(base.getDate() - 3)

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [selectedDate])

  function sameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  function navigate(dir: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    onChange(d)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      {/* Top row on mobile */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="px-2 py-1 border rounded shrink-0"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {days.map((day) => {
            const active = sameDay(day, selectedDate)

            return (
              <button
                key={day.toDateString()}
                onClick={() => onChange(day)}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded-full text-sm shrink-0 ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'bg-background text-muted-foreground'
                }`}
              >
                <div className="text-[10px] leading-none">
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className="font-medium leading-none">
                  {day.getDate()}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => navigate(1)}
          className="px-2 py-1 border rounded shrink-0"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar button moves down on mobile */}
      <div className="flex justify-end sm:justify-start">
        <button
          onClick={() => dateInputRef.current?.showPicker()}
          className="px-2 py-1 border rounded"
        >
          <Calendar size={16} />
        </button>
      </div>

      <input
        ref={dateInputRef}
        type="date"
        value={selectedDate.toISOString().split('T')[0]}
        onChange={(e) => onChange(new Date(e.target.value))}
        className="sr-only"
      />
    </div>
  )
}
