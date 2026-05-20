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
  CheckCircle2,
  TrendingUp,
  Eye,
  Circle,
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

  const filteredVisions = useMemo(() => {
    const now = new Date()
    return visions.filter(v => {
      if (!v.target_date) return false
      const d = new Date(v.target_date)
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
  }, [visions, view])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground animate-pulse font-black uppercase">
        Loading Architecture
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="flex flex-col gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">
            Goals & Vision
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            "Write the vision and make it plain." Habakkuk 2:2
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <VisionCreator onCreated={loadAll} />
          <Button
            onClick={() => setShowNew(true)}
            className="w-full sm:w-auto h-10 font-bold uppercase text-xs"
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
          <SelectTrigger className="w-full h-10 font-bold">
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

          {/* ── Stat Cards ── */}
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[
              { label: 'Total Goals',  value: goals.length,                                       unit: 'goals',   icon: Target,       gradient: 'from-violet-600 to-purple-700',  shadow: 'shadow-violet-500/30' },
              { label: 'Visions',      value: visions.length,                                     unit: 'visions', icon: Eye,           gradient: 'from-indigo-500 to-blue-600',    shadow: 'shadow-indigo-500/30' },
              { label: 'Done',         value: goals.filter(g => g.status === 'done').length,       unit: 'done',    icon: CheckCircle2,  gradient: 'from-emerald-600 to-teal-700',   shadow: 'shadow-emerald-500/30' },
              { label: 'In Progress',  value: goals.filter(g => g.status === 'doing').length,      unit: 'running', icon: TrendingUp,    gradient: 'from-blue-600 to-cyan-700',      shadow: 'shadow-blue-500/30' },
              { label: 'Not Started',  value: goals.filter(g => g.status === 'to_do').length,      unit: 'pending', icon: Circle,        gradient: 'from-slate-500 to-gray-600',     shadow: 'shadow-slate-500/30' },
            ].map(({ label, value, unit, icon: Icon, gradient, shadow }) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-[24px] bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Analytics</p>
                  <h3 className="text-sm font-black">Velocity Timeline</h3>
                </div>
              </div>
              <GoalsYearlyLineChart goals={filteredGoals} />
            </div>

            <div className="rounded-[24px] bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Distribution</p>
                  <h3 className="text-sm font-black">Sector Breakdown</h3>
                </div>
              </div>
              <GoalsDonutChart goals={goals} categories={uiCategories} />
            </div>
          </div>

          <div className="rounded-[24px] bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm p-5">
            <VisionBoard goals={goals} />
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex bg-muted/40 p-1 rounded-2xl gap-1">
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all',
                  view === v
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {showNew && (
            <div className="rounded-[24px] border border-dashed border-muted-foreground/30 p-5">
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

          {/* Period summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 shadow-lg shadow-violet-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{view}</span>
              </div>
              <p className="text-3xl font-black text-white leading-none">{filteredGoals.length}</p>
              <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">goals</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">✓ {filteredGoals.filter(g => g.status === 'done').length} done</span>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">▶ {filteredGoals.filter(g => g.status === 'doing').length} doing</span>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">◯ {filteredGoals.filter(g => g.status === 'to_do').length} todo</span>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-4 shadow-lg shadow-indigo-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{view}</span>
              </div>
              <p className="text-3xl font-black text-white leading-none">{filteredVisions.length}</p>
              <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">visions</p>
              <p className="text-xs font-semibold text-white/70 mt-3 leading-tight">Target dates in this period</p>
            </div>
          </div>

          <GoalList
              goals={filteredGoals}
              visions={visions}
              categories={uiCategories}
              onUpdated={goal =>
                setGoals(g => g.map(x => (x.id === goal.id ? goal : x)))
              }
              onDeleted={id => setGoals(g => g.filter(x => x.id !== id))}
            />
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
                {showArchived ? 'Active Mode' : ''}
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