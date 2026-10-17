'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { reduceMeditations, calculateStreak } from '@/lib/meditations/reducer'
import { PlannerTask } from '@/components/planner/DailyPlanner'
import { expandDays, type PlannerDayRow } from '@/lib/planner/tasks'
import { addDays, toLocalDateKey } from '@/lib/dates'
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
  const [allTasks, setAllTasks]     = useState<(PlannerTask & { day: string })[]>([])
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
      supabase.from('planner_days').select('day, user_id, tasks, completed_task_ids').eq('user_id', uid).lte('day', toLocalDateKey(new Date())),
      supabase.from('visions').select('id, title, emoji').eq('owner_id', uid),
    ])

    setGoals(goalsRes.data ?? [])
    setMeditations(meditationsRes.data ?? [])
    setBooksRead(booksRes.data?.length ?? 0)

    // Expand recurring tasks over the last year so time per vision counts every occurrence
    const rows = (historyRes.data ?? []) as PlannerDayRow[]
    const today = toLocalDateKey(new Date())
    const firstDay = rows.reduce((min, r) => (r.day < min ? r.day : min), today)
    const from = firstDay > addDays(today, -364) ? firstDay : addDays(today, -364)
    const recurringRows = rows.filter(r => Array.isArray(r.tasks) && r.tasks.some(t => t?.recurring))
    const days = expandDays({ userId: uid, rows, recurringRows, from, to: today })
    setAllTasks(days.flatMap(d => d.tasks.map(t => ({ ...t, day: d.day }))))

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
        <Link
          href="/protected/planner"
          className="inline-flex items-center gap-1 mb-3 pl-2 pr-3 h-8 rounded-full bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Planner
        </Link>
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