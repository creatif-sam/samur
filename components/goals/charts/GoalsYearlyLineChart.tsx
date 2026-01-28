'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'

type Scope = 'week' | 'month' | 'quarter' | 'year'

export function GoalsLineChart({
  goals,
}: {
  goals: Goal[]
}) {
  const [scope, setScope] = useState<Scope>('month')

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const { chartData, scopedGoals } = useMemo(() => {
    const scoped = goals.filter((g) => {
      if (!g.due_date) return false
      const d = new Date(g.due_date)
      d.setHours(0, 0, 0, 0)

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

    let data: any[] = []

    if (scope === 'week') {
      data = Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(now)
        day.setDate(now.getDate() - now.getDay() + i)

        const dayGoals = scoped.filter((g) => {
          const d = new Date(g.due_date!)
          d.setHours(0, 0, 0, 0)
          return d.getTime() === day.getTime()
        })

        return {
          label: day.toLocaleDateString(undefined, { weekday: 'short' }),
          total: dayGoals.length,
          completed: dayGoals.filter((g) => g.status === 'done').length,
        }
      })
    }

    if (scope === 'month') {
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate()

      data = Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1
        const dayGoals = scoped.filter(
          (g) => new Date(g.due_date!).getDate() === day
        )

        return {
          label: day.toString(),
          total: dayGoals.length,
          completed: dayGoals.filter((g) => g.status === 'done').length,
        }
      })
    }

    if (scope === 'quarter') {
      data = [0, 1, 2].map((i) => {
        const month = Math.floor(now.getMonth() / 3) * 3 + i
        const monthGoals = scoped.filter(
          (g) => new Date(g.due_date!).getMonth() === month
        )

        return {
          label: new Date(now.getFullYear(), month).toLocaleString('default', {
            month: 'short',
          }),
          total: monthGoals.length,
          completed: monthGoals.filter((g) => g.status === 'done').length,
        }
      })
    }

    if (scope === 'year') {
      data = Array.from({ length: 12 }).map((_, month) => {
        const monthGoals = scoped.filter(
          (g) => new Date(g.due_date!).getMonth() === month
        )

        return {
          label: new Date(now.getFullYear(), month).toLocaleString('default', {
            month: 'short',
          }),
          total: monthGoals.length,
          completed: monthGoals.filter((g) => g.status === 'done').length,
        }
      })
    }

    return { chartData: data, scopedGoals: scoped }
  }, [goals, scope])

  const completedCount = scopedGoals.filter(
    (g) => g.status === 'done'
  ).length

  const topFive = scopedGoals.slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['week', 'month', 'quarter', 'year'] as const).map((s) => (
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

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line dataKey="total" stroke="#7c3aed" strokeWidth={2} />
            <Line dataKey="completed" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Total goals" value={scopedGoals.length} />
        <Stat label="Completed" value={completedCount} />
        <Stat
          label="Completion rate"
          value={
            scopedGoals.length === 0
              ? '0%'
              : `${Math.round(
                  (completedCount / scopedGoals.length) * 100
                )}%`
          }
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Top 5 goals</div>
        {topFive.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No goals in this period
          </div>
        ) : (
          <ul className="space-y-1">
            {topFive.map((g) => (
              <li
                key={g.id}
                className="text-sm border rounded px-2 py-1 flex justify-between"
              >
                <span className="truncate">{g.title}</span>
                <span className="text-xs text-muted-foreground">
                  {g.status}
                </span>
              </li>
            ))}
          </ul>
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
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

export const GoalsYearlyLineChart = GoalsLineChart
