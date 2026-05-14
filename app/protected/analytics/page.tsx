'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { reduceMeditations, calculateStreak } from '@/lib/meditations/reducer'
import { PlannerTask } from '@/components/planner/DailyPlanner'
import VisionProgressDashboard from '@/components/planner/VisionTimeUsageDashboard'
import AnalyticsHero from '@/components/analytics/AnalyticsHero'
import AnalyticsStatCards from '@/components/analytics/AnalyticsStatCards'
import AnalyticsGoalSection from '@/components/analytics/AnalyticsGoalSection'

export default function AnalyticsPage() {
  const supabase = createClient()
  const [userId, setUserId]         = useState<string | null>(null)
  const [goals, setGoals]           = useState<Goal[]>([])
  const [meditations, setMeditations] = useState<{ created_at: string; period?: string; author_id: string }[]>([])
  const [booksRead, setBooksRead]   = useState(0)
  const [allTasks, setAllTasks]     = useState<PlannerTask[]>([])
  const [visionsMap, setVisionsMap] = useState<Record<string, any>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const uid = auth.user.id
    setUserId(uid)

    const [goalsRes, meditationsRes, booksRes, historyRes, visionsRes] = await Promise.all([
      supabase.from('goals').select('*').or(`owner_id.eq.${uid},partner_id.eq.${uid}`),
      supabase.from('meditations').select('created_at, period, author_id').eq('author_id', uid).order('created_at', { ascending: false }),
      supabase.from('readings').select('id').eq('user_id', uid).eq('status', 'done'),
      supabase.from('planner_days').select('tasks').eq('user_id', uid),
      supabase.from('visions').select('id, title, emoji').eq('owner_id', uid),
    ])

    setGoals(goalsRes.data ?? [])
    setMeditations(meditationsRes.data ?? [])
    setBooksRead(booksRes.data?.length ?? 0)

    const flat = historyRes.data?.flatMap(d => Array.isArray(d.tasks) ? d.tasks : []) ?? []
    setAllTasks(flat)

    const vMap: Record<string, any> = {}
    visionsRes.data?.forEach(v => { vMap[v.id] = v })
    setVisionsMap(vMap)
  }

  const meditationStreak = (() => {
    if (!meditations.length || !userId) return 0
    const byUser = reduceMeditations(meditations)
    return calculateStreak(byUser[userId] ?? {})
  })()

  const activeGoals        = goals.filter(g => g.status !== 'done')
  const completedGoals     = goals.filter(g => g.status === 'done')
  const goalCompletionRate = goals.length > 0
    ? Math.round((completedGoals.length / goals.length) * 100)
    : 0

  return (
    <div className="pb-24 min-h-screen bg-background text-foreground">

      {/* Header */}
      <div className="px-4 pt-5 pb-1">
        <p className="text-sm text-muted-foreground font-medium">Your growth</p>
        <h1 className="text-3xl font-black tracking-tight leading-none">
          Analytics <span className="text-violet-500">Lab</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Track what matters. Improve what counts.</p>
      </div>

      <AnalyticsHero
        meditationStreak={meditationStreak}
        goalCompletionRate={goalCompletionRate}
        totalGoals={goals.length}
        completedGoals={completedGoals.length}
      />

      <AnalyticsStatCards
        meditationStreak={meditationStreak}
        totalSessions={meditations.length}
        activeGoalsCount={activeGoals.length}
        completedGoalsCount={completedGoals.length}
        booksRead={booksRead}
      />

      <AnalyticsGoalSection goals={goals} />

      <div className="px-4 mt-6">
        <VisionProgressDashboard allTasks={allTasks} visionsMap={visionsMap} />
      </div>

    </div>
  )
}