'use client'

import { useEffect, useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'

export function TaskRecurrence({
  value,
  onChange,
}: {
  value: PlannerTask['recurring'] | null
  onChange: (v: PlannerTask['recurring'] | null) => void
}) {
  const [enabled, setEnabled] = useState(!!value)

  const base = value ?? {
    interval: 1,
    unit: 'week' as const,
    daysOfWeek: [] as number[],
    until: '',
  }

  useEffect(() => {
    if (!enabled) onChange(null)
  }, [enabled, onChange])

  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm mt-3"
      >
        🔁 Recurring
      </button>
    )
  }

  return (
    <div className="border rounded-xl p-3 space-y-3 mt-3">
      <div className="text-sm font-medium">
        🔁 Recurring
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={base.interval}
          onChange={(e) =>
            onChange({ ...base, interval: Number(e.target.value) })
          }
          className="w-16 border rounded-lg p-1 text-sm"
        />

        <select
          value={base.unit}
          onChange={(e) =>
            onChange({
              ...base,
              unit: e.target.value as 'day' | 'week',
            })
          }
          className="border rounded-lg p-1 text-sm"
        >
          <option value="day">day</option>
          <option value="week">week</option>
        </select>
      </div>

      <div className="flex gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <button
            key={i}
            onClick={() => {
              const days = base.daysOfWeek.includes(i)
                ? base.daysOfWeek.filter((x) => x !== i)
                : [...base.daysOfWeek, i]

              onChange({ ...base, daysOfWeek: days })
            }}
            className={`w-8 h-8 rounded-full text-sm ${
              base.daysOfWeek.includes(i)
                ? 'bg-violet-600 text-white'
                : 'bg-muted'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <input
        type="date"
        value={base.until}
        onChange={(e) =>
          onChange({ ...base, until: e.target.value })
        }
        className="border rounded-lg p-2 text-sm w-full"
      />
    </div>
  )
}
