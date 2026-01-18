'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { NewGoalForm } from '@/components/goals/NewGoalForm'
import { GoalList } from '@/components/goals/GoalList'

type GoalView = 'weekly' | 'quarterly' | 'yearly'

export default function GoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [view, setView] = useState<GoalView>('weekly')

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .or(`owner_id.eq.${auth.user.id},partner_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: false })

    if (error) console.error(error)

    setGoals(data ?? [])
    setLoading(false)
  }

  function onCreated(goal: Goal) {
    setGoals([goal, ...goals])
    setShowNew(false)
  }

  function onUpdated(goal: Goal) {
    setGoals(goals.map((g) => (g.id === goal.id ? goal : g)))
  }

  function onDeleted(id: string) {
    setGoals(goals.filter((g) => g.id !== id))
  }

  function exportGoals(list: Goal[], title: string) {
    const completed = list.filter((g) => g.status === 'done').length
    const inProgress = list.length - completed

    const text =
      `${title}\n` +
      `Completed ${completed} In progress ${inProgress}\n\n` +
      list
        .map(
          (g) =>
            `• ${g.title} | ${g.status} | ${g.due_date}`
        )
        .join('\n')

    navigator.clipboard.writeText(text)
    alert('Exported to clipboard')
  }

  if (loading) return <div className="p-4">Loading...</div>

  const now = new Date()

  const weekly = goals.filter((g) => {
    if (!g.due_date) return false
    const d = new Date(g.due_date)
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return d >= start && d < end
  })

  const quarterly = goals.filter(
    (g) =>
      g.due_date &&
      Math.floor(new Date(g.due_date).getMonth() / 3) ===
        Math.floor(now.getMonth() / 3) &&
      new Date(g.due_date).getFullYear() ===
        now.getFullYear()
  )

  const yearly = goals.filter(
    (g) =>
      g.due_date &&
      new Date(g.due_date).getFullYear() ===
        now.getFullYear()
  )

  const activeGoals =
    view === 'weekly'
      ? weekly
      : view === 'quarterly'
      ? quarterly
      : yearly

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <Tabs defaultValue="daily">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="daily">
            <Calendar className="w-4 h-4 mr-2" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="w-4 h-4 mr-2" />
            Goals
          </TabsTrigger>
        </TabsList>

        {/* DAILY TAB */}
        <TabsContent value="daily">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">
                Daily Planning
              </h2>
              <Button
                size="sm"
                onClick={() => setShowNew(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </div>

            {showNew && (
              <NewGoalForm
                onCancel={() => setShowNew(false)}
                onCreated={onCreated}
              />
            )}

            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
              Plan your day here. Goals created here will
              automatically appear in weekly quarterly and
              yearly views.
            </div>
          </div>
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals">
          <div className="space-y-4">
            <Tabs
              value={view}
              onValueChange={(v) =>
                setView(v as GoalView)
              }
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="weekly">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="quarterly">
                  Quarterly
                </TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold capitalize">
                {view} goals
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportGoals(
                      activeGoals,
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
                  New Goal
                </Button>
              </div>
            </div>

            {showNew && (
              <NewGoalForm
                onCancel={() => setShowNew(false)}
                onCreated={onCreated}
              />
            )}

            <GoalList
              goals={activeGoals}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
