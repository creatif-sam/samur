'use client'

import type { PlannerTask } from '../DailyPlanner'
import { Repeat, X } from 'lucide-react'

type RecurringUnit = 'day' | 'week' | 'month';

export function TaskRecurrence({
  value,
  onChange,
}: {
  value: PlannerTask['recurring'] | null
  onChange: (v: PlannerTask['recurring'] | null) => void
}) {
  if (!value) {
    return (
      <button
        onClick={() => onChange({ interval: 1, unit: 'week', daysOfWeek: [], until: '' })}
        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all mt-3"
      >
        <Repeat size={16} />
        Add Recurrence
      </button>
    )
  }

  const base = value

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] p-5 space-y-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Repeat size={14} />
          <span>Recurrence Rules</span>
        </div>
        <button 
          onClick={() => onChange(null)}
          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* FIXED ROW LAYOUT FOR PC */}
      <div className="flex flex-col md:flex-row gap-4 items-end w-full">
        {/* Interval: 1/4 of width on PC */}
        <div className="w-full md:w-1/4">
          <p className="text-[10px] font-bold text-blue-500 mb-1.5 ml-1 uppercase tracking-tight">Every</p>
          <input
            type="number"
            min={1}
            value={base.interval}
            onChange={(e) => onChange({ ...base, interval: Math.max(1, Math.floor(Number(e.target.value)) || 1) })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 dark:text-white outline-none"
          />
        </div>

        {/* Unit: 1/4 of width on PC */}
        <div className="w-full md:w-1/4">
          <p className="text-[10px] font-bold text-purple-500 mb-1.5 ml-1 uppercase tracking-tight">Unit</p>
          <select
            value={base.unit}
            onChange={(e) => onChange({ ...base, unit: e.target.value as RecurringUnit })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 dark:text-white outline-none appearance-none"
          >
            <option value="day">Days</option>
            <option value="week">Weeks</option>
            <option value="month">Months</option>
          </select>
        </div>

        {/* Until: 2/4 (Half) of width on PC */}
        <div className="w-full md:w-2/4">
          <p className="text-[10px] font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-tight">Until (Optional)</p>
          <input
            type="date"
            value={base.until ?? ''}
            onChange={(e) => onChange({ ...base, until: e.target.value })}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 dark:text-white [color-scheme:dark] outline-none"
          />
        </div>
      </div>

      {/* Day Picker Logic stays the same but styled better */}
      {base.unit === 'week' && (
        <div className="flex justify-between gap-1.5 pt-2 animate-in fade-in duration-300">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const days = base.daysOfWeek.includes(i)
                  ? base.daysOfWeek.filter((x) => x !== i)
                  : [...base.daysOfWeek, i]
                onChange({ ...base, daysOfWeek: days })
              }}
              className={`flex-1 aspect-square md:max-w-[40px] rounded-xl text-[11px] font-bold transition-all ${
                base.daysOfWeek.includes(i)
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      {base.unit === 'week' && base.daysOfWeek.length === 0 && (
        <p className="text-[11px] text-slate-400 px-1">No days picked: repeats on the weekday it starts.</p>
      )}
      {base.unit === 'month' && (
        <p className="text-[11px] text-slate-400 px-1">Repeats on the same date of the month (last day for shorter months).</p>
      )}
    </div>
  )
}