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

  const monthLabel = selectedDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const { mobileDays, desktopDays } = useMemo(() => {
    const desktopBase = new Date(selectedDate)
    desktopBase.setDate(selectedDate.getDate() - 3)

    const desktopDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(desktopBase)
      d.setDate(desktopBase.getDate() + i)
      return d
    })

    const mobileBase = new Date(selectedDate)
    mobileBase.setDate(selectedDate.getDate() - 2)

    const mobileDays = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(mobileBase)
      d.setDate(mobileBase.getDate() + i)
      return d
    })

    return { mobileDays, desktopDays }
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
    <div className="flex flex-col gap-2">
      <div className="text-center text-sm font-medium text-muted-foreground">
        {monthLabel}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="px-2 py-1 border rounded shrink-0"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-2 overflow-x-auto no-scrollbar overscroll-x-contain">
          <div className="flex gap-2 sm:hidden">
            {mobileDays.map(day => {
              const active = sameDay(day, selectedDate)

              return (
                <button
                  key={day.toDateString()}
                  onClick={() => onChange(day)}
                  className={`w-10 h-10 flex flex-col items-center justify-center border rounded-full text-sm shrink-0 ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-background text-muted-foreground'
                  }`}
                >
                  <div className="text-[10px] leading-none">
                    {day.toLocaleDateString(undefined, {
                      weekday: 'short',
                    })}
                  </div>
                  <div className="font-medium leading-none">
                    {day.getDate()}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="hidden sm:flex gap-2">
            {desktopDays.map(day => {
              const active = sameDay(day, selectedDate)

              return (
                <button
                  key={day.toDateString()}
                  onClick={() => onChange(day)}
                  className={`w-12 h-12 flex flex-col items-center justify-center border rounded-full text-sm shrink-0 ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-background text-muted-foreground'
                  }`}
                >
                  <div className="text-[10px] leading-none">
                    {day.toLocaleDateString(undefined, {
                      weekday: 'short',
                    })}
                  </div>
                  <div className="font-medium leading-none">
                    {day.getDate()}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={() => navigate(1)}
          className="px-2 py-1 border rounded shrink-0"
        >
          <ChevronRight size={16} />
        </button>
      </div>

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
        onChange={e => onChange(new Date(e.target.value))}
        className="sr-only"
      />
    </div>
  )
}
