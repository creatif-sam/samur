'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { computeDashboardStats } from '@/components/home/DashboardStats'
import DailyVerseCard from '@/components/meditations/DailyVerse'
import HomeStreakHero from '@/components/home/HomeStreakHero'
import HomeWeekCalendar from '@/components/home/HomeWeekCalendar'
import HomeQuickNav from '@/components/home/HomeQuickNav'
import HomeHighlightCards from '@/components/home/HomeHighlightCards'
import HomeActivityFeed from '@/components/home/HomeActivityFeed'

export default function HomePage() {
  const supabase = createClient()
  const [userName, setUserName]         = useState<string | null>(null)
  const [goals, setGoals]               = useState<Goal[]>([])
  const [meditations, setMeditations]   = useState<{ created_at: string }[]>([])
  const [currentBook, setCurrentBook]   = useState<any | null>(null)
  const [todayPlanner, setTodayPlanner] = useState<any | null>(null)

  const today = new Date()

  useEffect(() => { loadHomeData() }, [])

  async function loadHomeData() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const uid      = auth.user.id
    const todayStr = today.toISOString().split('T')[0]

    const [profileRes, goalsRes, meditationsRes, bookRes, plannerRes] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url').eq('id', uid).single(),
      supabase.from('goals').select('*').or(`owner_id.eq.${uid},partner_id.eq.${uid}`),
      supabase.from('meditations').select('created_at').eq('author_id', uid).order('created_at', { ascending: false }).limit(90),
      supabase.from('readings').select('id, title, author, total_pages, pages_remaining').eq('user_id', uid).eq('status', 'reading').limit(1).maybeSingle(),
      supabase.from('planner_days').select('morning, tasks, mood').eq('user_id', uid).eq('day', todayStr).maybeSingle(),
    ])

    setUserName(profileRes.data?.full_name ?? null)
    setGoals(goalsRes.data ?? [])
    setMeditations(meditationsRes.data ?? [])
    setCurrentBook(bookRes.data ?? null)
    setTodayPlanner(plannerRes.data ?? null)
  }

  const meditationStreak = computeStreak(meditations)
  const stats            = computeDashboardStats(goals)
  const activeGoals      = goals.filter(g => g.status !== 'done')
  const topGoal          = activeGoals[0] ?? null
  const completedGoals   = goals.filter(g => g.status === 'done').length

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = userName?.split(' ')[0] ?? 'Friend'

  return (
    <div className="pb-24 min-h-screen bg-background text-foreground">

      {/* Greeting */}
      <div className="px-4 pt-5 pb-1">
        <p className="text-sm text-muted-foreground font-medium">{greeting()}</p>
        <h1 className="text-3xl font-black tracking-tight leading-none">
          Hello, <span className="text-violet-500">{firstName}</span> 🕊️
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Stay intentional. Stay consistent.</p>
      </div>

      <HomeStreakHero streak={meditationStreak} />
      <HomeWeekCalendar />
      <HomeQuickNav />
      <HomeHighlightCards
        todayPlanner={todayPlanner}
        topGoal={topGoal}
        currentBook={currentBook}
      />
      <HomeActivityFeed
        meditationStreak={meditationStreak}
        activeGoalsCount={activeGoals.length}
        completedGoalsCount={completedGoals}
        dueTodayCount={stats.todayDue}
      />

      {/* Daily Verse */}
      <div className="px-4 mt-5">
        <DailyVerseCard />
      </div>

    </div>
  )
}

function computeStreak(meditations: { created_at: string }[]): number {
  if (!meditations.length) return 0
  const dates  = new Set(meditations.map(m => m.created_at.slice(0, 10)))
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let streak = 0
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
