'use client'

import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { GoalsDonutChart } from '@/components/goals/charts/GoalsDonutChart'
import { GoalsYearlyLineChart } from '@/components/goals/charts/GoalsYearlyLineChart'

interface GoalCategory {
  id: string
  name: string
  color: string
  emoji: string | null
}

export function GoalsOverview({
  goals,
  categories,
}: {
  goals: Goal[]
  categories: GoalCategory[]
}) {
  const router = useRouter()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayGoals = goals.filter((g) => {
    if (!g.due_date) return false
    const d = new Date(g.due_date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const completed = goals.filter(
    (g) => g.status === 'done'
  ).length

  const pieData = (() => {
    const map: Record<string, number> = {}

    goals.forEach((g: any) => {
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
          color: cat?.color ?? '#8884d8',
          emoji: cat?.emoji ?? '📌',
        }
      }
    )
  })()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Progress snapshot and today focus
          </p>
        </div>

        <Button
          size="sm"
          onClick={() =>
            router.push('/protected/goals/daily')
          }
        >
          Go to Today
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">
          Yearly Goal Timeline
        </h3>
        <GoalsYearlyLineChart goals={goals} />
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">
          Goals by Period
        </h3>
        <GoalsDonutChart
  data={pieData}
  totalGoals={goals.length}
  completedGoals={completed}
/>

      </div>
    </div>
  )
}
