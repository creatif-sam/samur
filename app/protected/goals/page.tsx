'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { VisionBoard } from '@/components/goals/VisionBoard'
import { Users, BarChart3, Archive } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'visions'>('overview')

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

  // Derived hero stats
  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.status === 'done').length
  const activeGoals = goals.filter(g => g.status !== 'done').length
  const completionPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  const periodCompleted = filteredGoals.filter(g => g.status === 'done').length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Goals</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">

      {/* â”€â”€ HERO CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-violet-900/30">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
          Goals &amp; Vision Â· &quot;Write it plain&quot; â€” Hab 2:2
        </p>

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Completed</p>
              <p className="text-5xl font-black text-white leading-none">{completedGoals}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total</p>
                <p className="text-xl font-black text-white">{totalGoals}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active</p>
                <p className="text-xl font-black text-white">{activeGoals}</p>
              </div>
            </div>
          </div>

          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - completionPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-black text-white leading-none">{completionPct}%</p>
              <p className="text-[9px] font-bold text-white/50 uppercase">Done</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/15 relative z-10 flex gap-2">
          <button
            onClick={() => { setActiveTab('goals'); setShowNew(true) }}
            className="flex-1 py-2 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/25 transition-all"
          >
            + New Goal
          </button>
          <VisionCreator onCreated={loadAll} />
        </div>
      </div>

      {/* â”€â”€ VISION FILTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {visions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedVisionId('all')}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
              selectedVisionId === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            )}
          >
            All Visions
          </button>
          {visions.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVisionId(v.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
                selectedVisionId === v.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {v.emoji} {v.title}
            </button>
          ))}
        </div>
      )}

      {/* â”€â”€ TAB SWITCHER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {(['overview', 'goals', 'visions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === tab
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'overview' ? 'ðŸ“Š Overview' : tab === 'goals' ? 'ðŸŽ¯ Goals' : 'ðŸš€ Visions'}
          </button>
        ))}
      </div>

      {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] uppercase font-bold flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              Velocity Timeline
            </h3>
            <GoalsYearlyLineChart goals={filteredGoals} />
          </div>
          <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] uppercase font-bold flex items-center gap-2 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Sector Distribution
            </h3>
            <GoalsDonutChart goals={goals} categories={uiCategories} />
          </div>
          <div className="bg-muted/30 rounded-2xl p-4">
            <VisionBoard goals={goals} />
          </div>
        </div>
      )}

      {/* â”€â”€ GOALS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'flex-1 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all',
                  view === v
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'weekly' ? 'Week' : v === 'monthly' ? 'Month' : v === 'quarterly' ? 'Qtr' : 'Year'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{filteredGoals.length}</span> goals Â·{' '}
              <span className="font-bold text-emerald-500">{periodCompleted}</span> done
            </p>
            <button
              onClick={() => setShowNew(v => !v)}
              className="text-xs font-bold text-violet-500 hover:text-violet-400 transition-colors"
            >
              {showNew ? 'âœ• Cancel' : '+ Add Goal'}
            </button>
          </div>

          {showNew && (
            <div className="bg-muted/30 rounded-2xl p-4">
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

          <div className="bg-muted/30 rounded-2xl p-4">
            <GoalList
              goals={filteredGoals}
              visions={visions}
              categories={uiCategories}
              onUpdated={goal => setGoals(g => g.map(x => (x.id === goal.id ? goal : x)))}
              onDeleted={id => setGoals(g => g.filter(x => x.id !== id))}
            />
          </div>
        </div>
      )}

      {/* â”€â”€ VISIONS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'visions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-black">{showArchived ? 'Archive Vault' : 'Vision Portfolio'}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Long-term strategic roadmap</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  showArchived
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <Archive className="w-3 h-3" />
                {showArchived ? 'Active' : 'Archive'}
              </button>
              <VisionCreator onCreated={loadAll} />
            </div>
          </div>

          <VisionListView
            goals={goals}
            visions={visions}
            categories={uiCategories}
            onRefresh={loadAll}
          />
        </div>
      )}
    </div>
  )
}
