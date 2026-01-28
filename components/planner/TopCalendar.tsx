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
    month: 'short',
    year: 'numeric',
  })

  const { mobileDays, desktopDays } = useMemo(() => {
    // DESKTOP: Keep 7 days for wider screens
    const desktopBase = new Date(selectedDate)
    desktopBase.setDate(selectedDate.getDate() - 3)
    const desktopDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(desktopBase)
      d.setDate(desktopBase.getDate() + i)
      return d
    })

    // MOBILE: Exactly 4 days (1 Past, Today/Selected, 2 Future)
    const mobileBase = new Date(selectedDate)
    mobileBase.setDate(selectedDate.getDate() - 1) // Start from 1 day ago
    const mobileDays = Array.from({ length: 4 }).map((_, i) => {
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

  return (
    <div className="flex flex-col gap-4">
      {/* Centered Month/Year and Picker */}
      <div className="flex items-center justify-between px-2">
        <button 
           onClick={() => dateInputRef.current?.showPicker()}
           className="text-lg font-bold uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2"
        >
          {monthLabel}
          <Calendar size={14} className="text-slate-400" />
        </button>
        
        <div className="flex gap-1">
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() - 1); onChange(d);
          }} className="p-2 text-slate-400 hover:text-slate-900"><ChevronLeft size={20} /></button>
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() + 1); onChange(d);
          }} className="p-2 text-slate-400 hover:text-slate-900"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Rolling Days Container */}
      <div className="flex justify-between items-center gap-2 px-1">
        {/* Mobile View: 4 Days */}
        <div className="flex sm:hidden w-full justify-between gap-2">
          {mobileDays.map(day => {
            const active = sameDay(day, selectedDate)
            const isToday = sameDay(day, new Date())

            return (
              <button
                key={day.toDateString()}
                onClick={() => onChange(day)}
                className={`flex-1 flex flex-col items-center justify-center py-4 rounded-[24px] transition-all duration-300 ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                    : 'bg-transparent text-slate-400'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${active ? 'text-blue-100' : 'text-slate-300'}`}>
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {day.getDate()}
                </span>
                {isToday && !active && (
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-1" />
                )}
              </button>
            )
          })}
        </div>

        {/* Desktop View: 7 Days */}
        <div className="hidden sm:flex w-full justify-between gap-2">
          {desktopDays.map(day => {
            const active = sameDay(day, selectedDate)
            return (
              <button
                key={day.toDateString()}
                onClick={() => onChange(day)}
                className={`flex-1 flex flex-col items-center justify-center py-4 rounded-[24px] border ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest mb-1">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="text-lg font-bold">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
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