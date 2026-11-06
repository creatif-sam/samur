'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Target,
  LayoutDashboard,
  Sparkles,
  Flag,
  Rocket,
  Eye,
} from 'lucide-react'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { GoalList } from '@/components/goals/GoalList'
import { GoalsOverview } from '@/components/goals/GoalsOverview'
import { VisionCreator } from '@/components/goals/VisionCreator'
import { VisionListView } from '@/components/goals/VisionListView'
import { cn } from '@/lib/utils'
import { dueDate, inPeriod, isOverdue } from '@/lib/goals'
import { parseDateKey } from '@/lib/dates'

type GoalView = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Vision {
  id: string
  title: string
  description?: string
  color: string
  emoji: string | null
  target_date: string | null
  is_archived: boolean
  created_at?: string
}

export default function GoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [visions, setVisions] = useState<Vision[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [view, setView] = useState<GoalView>('monthly')
  const [tab, setTab] = useState('overview')
  const [selectedVisionId, setSelectedVisionId] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    setCurrentUserId(user.id)

    const [gRes, cRes, vRes] = await Promise.all([
      supabase
        .from('goals')
        .select('*, goal_categories(*), visions(*)')
        .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('goal_categories').select('*').eq('user_id', user.id),
      supabase.from('visions').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    ])

    setGoals(gRes.data ?? [])
    setCategories(cRes.data ?? [])
    setVisions(vRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

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

  // Archived visions stay out of pickers and the focus filter
  const activeVisions = useMemo(() => visions.filter(v => !v.is_archived), [visions])

  // The focus vision applies to the whole page: stats, charts and lists
  const focusGoals = useMemo(
    () => (selectedVisionId === 'all' ? goals : goals.filter(g => g.vision_id === selectedVisionId)),
    [goals, selectedVisionId],
  )

  const filteredGoals = useMemo(() => {
    return focusGoals.filter(g => {
      // Goals with no due date are always shown regardless of period
      const d = dueDate(g)
      if (!d) return true
      // Unfinished overdue goals stay visible until they're done
      if (isOverdue(g)) return true
      return inPeriod(d, view)
    })
  }, [focusGoals, view])

  const filteredVisions = useMemo(() => {
    return activeVisions.filter(v => {
      if (selectedVisionId !== 'all' && v.id !== selectedVisionId) return false
      if (!v.target_date) return false
      return inPeriod(parseDateKey(v.target_date), view)
    })
  }, [activeVisions, view, selectedVisionId])

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
          <div className="flex items-center justify-center gap-1 sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">
              Goals & Vision
            </h1>
            <HelpTip topic="goals.page" align="left" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            "Write the vision and make it plain." Habakkuk 2:2
          </p>
        </div>

      </header>

      <div className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-xl border border-dashed border-primary/20">
        <div className="flex justify-center sm:justify-start items-center gap-2 text-primary font-bold text-[10px] uppercase">
          <Sparkles className="w-4 h-4" />
          Focus Vision
          <HelpTip topic="goals.focus" align="left" className="-my-1" />
        </div>

        <Select value={selectedVisionId} onValueChange={setSelectedVisionId}>
          <SelectTrigger className="w-full h-10 font-bold">
            <SelectValue placeholder="All Active Visions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Display All Visions</SelectItem>
            {activeVisions.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.emoji} {v.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 h-14">
          <TabsTrigger value="overview" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <Target className="w-4 h-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="visions" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <Rocket className="w-4 h-4" />
            Visions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

          <GoalsOverview
            goals={focusGoals}
            visions={selectedVisionId === 'all' ? visions : visions.filter(v => v.id === selectedVisionId)}
            categories={uiCategories}
            onOpenVisions={() => setTab('visions')}
          />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-black text-xl uppercase tracking-tight">New Goal</DialogTitle>
                <DialogDescription className="sr-only">Create a new goal</DialogDescription>
              </DialogHeader>
              <NewGoalForm
                categories={uiCategories}
                visions={visions}
                onCancel={() => setShowNew(false)}
                onCreated={g => {
                  setGoals([g, ...goals])
                  setShowNew(false)
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Period summary cards */}
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Goals due</p>
            <HelpTip topic="goals.list" align="left" className="-my-1" />
          </div>
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
              currentUserId={currentUserId}
              onUpdated={goal =>
                setGoals(g => g.map(x => (x.id === goal.id ? goal : x)))
              }
              onDeleted={id => setGoals(g => g.filter(x => x.id !== id))}
            />

          {/* FAB – New Goal */}
          <button
            onClick={() => setShowNew(true)}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-lg shadow-violet-500/40 flex items-center justify-center transition-all"
            aria-label="New Goal"
          >
            <Plus className="w-6 h-6" />
          </button>
        </TabsContent>

        <TabsContent value="visions" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase flex gap-2">
                <Flag className="w-4 h-4 text-primary" />
                Vision Portfolio
                <HelpTip topic="goals.visions" align="left" className="-my-1" />
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase">
                Long term strategic roadmap
              </p>
            </div>
            <VisionCreator onCreated={loadAll} />
          </div>

          <VisionListView
            goals={goals}
            visions={visions}
            categories={uiCategories}
            currentUserId={currentUserId}
            onRefresh={loadAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}