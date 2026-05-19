'use client'

import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowRight, Target, CheckCircle2, TrendingUp, AlertTriangle, CalendarDays } from 'lucide-react'
import { GoalsDonutChart } from '@/components/goals/charts/GoalsDonutChart'
import { GoalsYearlyLineChart } from '@/components/goals/charts/GoalsYearlyLineChart'

interface GoalCategory {
  id: string
  name: string
  color: string
  emoji?: string
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

  const total = goals.length
  const done = goals.filter(g => g.status === 'done').length
  const inProgress = goals.filter(g => g.status === 'doing').length
  const blocked = goals.filter(g => g.status === 'blocked').length

  const statCards = [
    { label: 'Total Goals', value: total, unit: 'goals', icon: Target, gradient: 'from-violet-600 to-purple-700', shadow: 'shadow-violet-500/30' },
    { label: 'Completed', value: done, unit: 'done', icon: CheckCircle2, gradient: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-500/30' },
    { label: 'In Progress', value: inProgress, unit: 'running', icon: TrendingUp, gradient: 'from-blue-600 to-cyan-700', shadow: 'shadow-blue-500/30' },
    { label: 'Blocked', value: blocked, unit: 'paused', icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/30' },
    { label: 'Due Today', value: todayGoals.length, unit: 'due today', icon: CalendarDays, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
  ]

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─── */}
      <div className="flex gap-3 px-0 overflow-x-auto pb-2 no-scrollbar">
        {statCards.map(({ label, value, unit, icon: Icon, gradient, shadow }) => (
          <div key={label} className={`flex-shrink-0 w-32 rounded-3xl bg-gradient-to-br p-4 shadow-lg ${gradient} ${shadow}`}>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-3xl font-black text-white leading-none">{value}</p>
            <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">{unit}</p>
            <p className="text-xs font-semibold text-white/80 mt-2 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div>
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
  goals={goals}
 categories={categories}

/>


      </div>
    </div>
  )
}
