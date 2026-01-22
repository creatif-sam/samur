'use client'

import { useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'

type Scope = 'day' | 'week' | 'month' | 'quarter' | 'year'

interface GoalCategory {
  id: string
  name: string
  color: string
  emoji?: string
}

export function GoalsDonutChart({
  goals,
  categories,
}: {
  goals: Goal[]
  categories: GoalCategory[]
}) {
  const [scope, setScope] = useState<Scope>('month')

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const scopedGoals = useMemo(() => {
    return goals.filter((g) => {
      if (!g.due_date) return false
      const d = new Date(g.due_date)
      d.setHours(0, 0, 0, 0)

      if (scope === 'day') {
        return d.getTime() === now.getTime()
      }

      if (scope === 'week') {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        const end = new Date(start)
        end.setDate(start.getDate() + 7)
        return d >= start && d < end
      }

      if (scope === 'month') {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      }

      if (scope === 'quarter') {
        return (
          Math.floor(d.getMonth() / 3) ===
            Math.floor(now.getMonth() / 3) &&
          d.getFullYear() === now.getFullYear()
        )
      }

      return d.getFullYear() === now.getFullYear()
    })
  }, [goals, scope])

  const pieData = useMemo(() => {
    const map: Record<string, number> = {}

    scopedGoals.forEach((g) => {
      if (!g.category_id) return
      map[g.category_id] =
        (map[g.category_id] ?? 0) + 1
    })

    return Object.entries(map).map(
      ([categoryId, value]) => {
        const cat = categories.find(
          (c) => c.id === categoryId
        )
        return {
          name: cat?.name ?? 'Uncategorized',
          value,
          color: cat?.color ?? '#7c3aed',
          emoji: cat?.emoji ?? '📌',
        }
      }
    )
  }, [scopedGoals, categories])

  const completedCount = scopedGoals.filter(
    (g) => g.status === 'done'
  ).length

  const completionRate =
    scopedGoals.length === 0
      ? 0
      : Math.round(
          (completedCount / scopedGoals.length) * 100
        )

  return (
    <div className="space-y-4">
      {/* SCOPE BUTTONS */}
      <div className="flex flex-wrap gap-2">
        {(
          ['day', 'week', 'month', 'quarter', 'year'] as const
        ).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={scope === s ? 'default' : 'outline'}
            onClick={() => setScope(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* DONUT */}
      <div className="h-56">
        {pieData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No goals in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Total" value={scopedGoals.length} />
        <Stat label="Completed" value={completedCount} />
        <Stat label="Rate" value={`${completionRate}%`} />
      </div>

      {/* GOALS LIST */}
{/* GOALS LIST */}
<div className="space-y-2">
  <div className="text-xs font-medium text-violet-600">
    Goals in this period
  </div>

  {scopedGoals.length === 0 ? (
    <div className="text-xs text-violet-400">
      No goals to show
    </div>
  ) : (
    <ul className="space-y-1">
      {scopedGoals.slice(0, 5).map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between text-sm
                     border border-violet-200 rounded-md
                     px-2 py-1 bg-violet-50"
        >
          <span className="truncate text-violet-900">
            {g.title}
          </span>
          <span
            className={`text-xs ${
              g.status === 'done'
                ? 'text-green-600'
                : 'text-violet-500'
            }`}
          >
            {g.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  )}

  {scopedGoals.length > 5 && (
    <div className="text-xs text-violet-500">
      +{scopedGoals.length - 5} more
    </div>
  )}
</div>

    </div>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold">
        {value}
      </div>
    </div>
  )
}
