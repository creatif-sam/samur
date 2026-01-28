'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { VisionBoard } from '@/components/goals/VisionBoard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Target,
  Users,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  Flag,
  Rocket,
  Archive,
} from 'lucide-react'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { GoalList } from '@/components/goals/GoalList'
import { GoalsDonutChart } from '@/components/goals/charts/GoalsDonutChart'
import { GoalsYearlyLineChart } from '@/components/goals/charts/GoalsYearlyLineChart'
import { VisionCreator } from '@/components/goals/VisionCreator'
import { VisionListView } from '@/components/goals/VisionListView'
import { cn } from '@/lib/utils'

type GoalView = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Vision {
  id: string
  title: string
  description?: string
  color: string
  emoji: string | null
  target_date: string | null
  is_archived: boolean
}

export default function GoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [visions, setVisions] = useState<Vision[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [view, setView] = useState<GoalView>('weekly')
  const [selectedVisionId, setSelectedVisionId] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)

    let vQuery = supabase.from('visions').select('*').eq('owner_id', user.id)
    if (!showArchived) vQuery = vQuery.eq('is_archived', false)

    const [gRes, cRes, vRes] = await Promise.all([
      supabase
        .from('goals')
        .select('*, goal_categories(*), visions(*)')
        .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('goal_categories').select('*').eq('user_id', user.id),
      vQuery.order('created_at', { ascending: false }),
    ])

    setGoals(gRes.data ?? [])
    setCategories(cRes.data ?? [])
    setVisions(vRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [showArchived])

  const uiCategories: GoalCategory[] = useMemo(
    () =>
      categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        emoji: c.emoji ?? undefined,
      })),
    [categories]
  )

  const filteredGoals = useMemo(() => {
    const now = new Date()
    let base = goals

    if (selectedVisionId !== 'all') {
      base = base.filter(g => g.vision_id === selectedVisionId)
    }

    return base.filter(g => {
      if (!g.due_date) return false
      const d = new Date(g.due_date)

      switch (view) {
        case 'weekly': {
          const start = new Date(now)
          start.setDate(now.getDate() - now.getDay())
          const end = new Date(start)
          end.setDate(start.getDate() + 7)
          return d >= start && d < end
        }
        case 'monthly':
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        case 'quarterly':
          return (
            Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
            d.getFullYear() === now.getFullYear()
          )
        case 'yearly':
          return d.getFullYear() === now.getFullYear()
        default:
          return true
      }
    })
  }, [goals, view, selectedVisionId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground animate-pulse font-black italic uppercase">
        Loading Architecture
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="flex flex-col gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic uppercase">
            Goals & Vision
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            "Write the vision and make it plain." Habakkuk 2:2
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <VisionCreator onCreated={loadAll} />
          <Button
            onClick={() => setShowNew(true)}
            className="w-full sm:w-auto h-10 font-bold uppercase italic text-xs"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-xl border border-dashed border-primary/20">
        <div className="flex justify-center sm:justify-start items-center gap-2 text-primary font-bold text-[10px] uppercase">
          <Sparkles className="w-4 h-4" />
          Focus Vision
        </div>

        <Select value={selectedVisionId} onValueChange={setSelectedVisionId}>
          <SelectTrigger className="w-full h-10 font-bold italic">
            <SelectValue placeholder="All Active Visions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Display All Visions</SelectItem>
            {visions.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.emoji} {v.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-3 h-11">
          <TabsTrigger value="overview" className="text-[9px] font-bold uppercase">
            <LayoutDashboard className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-[9px] font-bold uppercase">
            <Target className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="visions" className="text-[9px] font-bold uppercase">
            <Rocket className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <h3 className="text-[10px] uppercase font-bold flex gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Velocity Timeline
              </h3>
              <GoalsYearlyLineChart goals={filteredGoals} />
            </div>

            <div className="bg-card border rounded-xl p-4 space-y-4">
              <h3 className="text-[10px] uppercase font-bold flex gap-2">
                <Users className="w-4 h-4 text-primary" />
                Sector Distribution
              </h3>
              <GoalsDonutChart goals={goals} categories={uiCategories} />
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4">
            <VisionBoard goals={goals} />
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-center bg-muted/30 p-2 rounded-lg">
            <div className="grid grid-cols-4 gap-1">
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(v => (
                <Button
                  key={v}
                  size="sm"
                  variant={view === v ? 'secondary' : 'ghost'}
                  onClick={() => setView(v)}
                  className="h-8 text-[10px] font-black capitalize"
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {showNew && (
            <div className="border border-dashed rounded-xl p-4">
              <NewGoalForm
                categories={uiCategories}
                visions={visions}
                onCancel={() => setShowNew(false)}
                onCreated={g => {
                  setGoals([g, ...goals])
                  setShowNew(false)
                }}
              />
            </div>
          )}

          <div className="bg-card border rounded-xl p-4">
            <GoalList
              goals={filteredGoals}
              onUpdated={goal =>
                setGoals(g => g.map(x => (x.id === goal.id ? goal : x)))
              }
              onDeleted={id => setGoals(g => g.filter(x => x.id !== id))}
            />
          </div>
        </TabsContent>

        <TabsContent value="visions" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase flex gap-2">
                <Flag className="w-4 h-4 text-primary" />
                {showArchived ? 'Archive Vault' : 'Vision Portfolio'}
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase">
                Long term strategic roadmap
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  'h-10 text-[10px] font-bold uppercase',
                  showArchived
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <Archive className="w-3 h-3 mr-2" />
                {showArchived ? 'Active Mode' : 'View Archive'}
              </Button>
              <VisionCreator onCreated={loadAll} />
            </div>
          </div>

          <VisionListView
            goals={goals}
            visions={visions}
            categories={uiCategories}
            onRefresh={loadAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
