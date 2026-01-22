'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { VisionBoard } from '@/components/goals/VisionBoard'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Plus,
  Calendar,
  Target,
  Download,
  Users,
} from 'lucide-react'
import {
  NewGoalForm,
  GoalCategory,
} from '@/components/goals/NewGoalForm'
import { GoalList } from '@/components/goals/GoalList'

import { GoalsDonutChart } from '@/components/goals/charts/GoalsDonutChart'
import { GoalsYearlyLineChart } from '@/components/goals/charts/GoalsYearlyLineChart'

type GoalView = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface DbGoalCategory {
  id: string
  name: string
  color: string
  emoji: string | null
}

export const dynamic = 'force-dynamic'

export default function GoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] =
    useState<DbGoalCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [view, setView] =
    useState<GoalView>('weekly')
  const [showSharedOnly, setShowSharedOnly] =
    useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const { data: auth } =
      await supabase.auth.getUser()
    if (!auth.user) {
      setLoading(false)
      return
    }

    const [{ data: goalsData }, { data: categoryData }] =
      await Promise.all([
        supabase
          .from('goals')
          .select('*, goal_categories(*)')
          .or(
            `owner_id.eq.${auth.user.id},partner_id.eq.${auth.user.id}`
          )
          .order('created_at', {
            ascending: false,
          }),
        supabase
          .from('goal_categories')
          .select('*')
          .eq('user_id', auth.user.id),
      ])

    setGoals(goalsData ?? [])
    setCategories(categoryData ?? [])
    setLoading(false)
  }

  function onCreated(goal: Goal) {
    setGoals((g) => [goal, ...g])
    setShowNew(false)
  }

  function onUpdated(goal: Goal) {
    setGoals((g) =>
      g.map((x) => (x.id === goal.id ? goal : x))
    )
  }

  function onDeleted(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id))
  }

  function exportGoals(list: Goal[], title: string) {
    const text =
      `${title}\n\n` +
      list
        .map(
          (g) =>
            `• ${g.title} | ${g.status} | ${g.due_date}`
        )
        .join('\n')

    navigator.clipboard.writeText(text)
    alert('Exported to clipboard')
  }

  const now = new Date()

  const baseGoals = showSharedOnly
    ? goals.filter((g) => g.goal_type === 'combined')
    : goals

  const filteredGoals = useMemo(() => {
    if (view === 'weekly') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 7)

      return baseGoals.filter((g) => {
        if (!g.due_date) return false
        const d = new Date(g.due_date)
        return d >= start && d < end
      })
    }

    if (view === 'monthly') {
      return baseGoals.filter((g) => {
        if (!g.due_date) return false
        const d = new Date(g.due_date)
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      })
    }

    if (view === 'quarterly') {
      return baseGoals.filter((g) => {
        if (!g.due_date) return false
        const d = new Date(g.due_date)
        return (
          Math.floor(d.getMonth() / 3) ===
            Math.floor(now.getMonth() / 3) &&
          d.getFullYear() === now.getFullYear()
        )
      })
    }

    return baseGoals.filter(
      (g) =>
        g.due_date &&
        new Date(g.due_date).getFullYear() ===
          now.getFullYear()
    )
  }, [baseGoals, view])

  const uiCategories: GoalCategory[] = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        emoji: c.emoji ?? undefined,
      })),
    [categories]
  )

  const pieData = useMemo(() => {
    const map: Record<string, number> = {}

    filteredGoals.forEach((g: any) => {
      if (!g.category_id) return
      map[g.category_id] =
        (map[g.category_id] ?? 0) + 1
    })

    return Object.entries(map).map(
      ([categoryId, value]) => {
        const cat = uiCategories.find(
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
  }, [filteredGoals, uiCategories])

  const completedCount = filteredGoals.filter(
    (g) => g.status === 'done'
  ).length

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {loading ? (
        <div className="p-4">Loading...</div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">
              <Calendar className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">
                  Yearly Goal Timeline
                </h3>
                <GoalsYearlyLineChart
                  goals={filteredGoals}
                />
              </div>

              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">
                  Goals by Category
                </h3>
                <GoalsDonutChart
  goals={goals}
  categories={uiCategories}
/>

              </div>
            </div>


            <div className="border rounded-xl p-4 space-y-3">
  <h3 className="text-sm font-semibold">
    Vision Board
  </h3>
  <p className="text-xs text-muted-foreground">
    Words shaping your goals
  </p>

  <VisionBoard goals={goals} />
</div>



          </TabsContent>

          <TabsContent value="goals">
            <div className="space-y-4 mt-6">
              <div className="flex gap-2">
                {(
                  [
                    'weekly',
                    'monthly',
                    'quarterly',
                    'yearly',
                  ] as const
                ).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={
                      view === v ? 'default' : 'outline'
                    }
                    onClick={() => setView(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <div className="flex justify-between">
                <div className="text-sm font-semibold capitalize">
                  {view} goals
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={
                      showSharedOnly
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() =>
                      setShowSharedOnly(!showSharedOnly)
                    }
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Shared
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportGoals(
                        filteredGoals,
                        `${view.toUpperCase()} GOALS`
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowNew(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New
                  </Button>
                </div>
              </div>

              {showNew && (
                <NewGoalForm
                  categories={uiCategories}
                  onCancel={() => setShowNew(false)}
                  onCreated={onCreated}
                />
              )}

              <GoalList
                goals={filteredGoals}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
