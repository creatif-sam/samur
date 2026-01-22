'use client'

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

export function GoalsYearlyLineChart({
  goals,
}: {
  goals: Goal[]
}) {
  const currentYear = new Date().getFullYear()

  const data = Array.from({ length: 12 }).map(
    (_, month) => {
      const monthGoals = goals.filter((g) => {
        if (!g.due_date) return false
        const d = new Date(g.due_date)
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === month
        )
      })

      return {
        month: new Date(
          currentYear,
          month
        ).toLocaleString('default', {
          month: 'short',
        }),
        total: monthGoals.length,
        completed: monthGoals.filter(
          (g) => g.status === 'done'
        ).length,
      }
    }
  )

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#7c3aed"
            strokeWidth={2}
            dot
            name="Total goals"
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#16a34a"
            strokeWidth={2}
            dot
            name="Completed goals"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
