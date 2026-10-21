'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import DailyVerseCard from '@/components/meditations/DailyVerse'
import HomeQuickNav from '@/components/home/HomeQuickNav'
import GratitudeCard from '@/components/home/GratitudeCard'
import YearThemeCard from '@/components/home/YearThemeCard'
import UpcomingGoalsCountdown from '@/components/home/UpcomingGoalsCountdown'
import TodayPanel from '@/components/home/TodayPanel'
import CurrentBookCard, { type CurrentBook } from '@/components/home/CurrentBookCard'

export default function HomePage() {
  const supabase = createClient()
  const [userName, setUserName]       = useState<string | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)
  const [goals, setGoals]             = useState<Goal[]>([])
  const [currentBook, setCurrentBook] = useState<CurrentBook | null>(null)

  const today = new Date()

  useEffect(() => { loadHomeData() }, [])

  async function loadHomeData() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const uid = auth.user.id
    setUserId(uid)

    const [profileRes, goalsRes, bookRes] = await Promise.all([
      supabase.from('profiles').select('name, avatar_url').eq('id', uid).single(),
      supabase.from('goals').select('*').or(`owner_id.eq.${uid},partner_id.eq.${uid}`),
      supabase.from('readings').select('id, title, author, total_pages, pages_remaining').eq('user_id', uid).eq('status', 'reading').limit(1).maybeSingle(),
    ])

    setUserName(profileRes.data?.name ?? null)
    setGoals(goalsRes.data ?? [])
    setCurrentBook(bookRes.data ?? null)
  }

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = userName?.split(' ')[0] ?? 'Friend'

  return (
    <div className="pb-24 min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto">

        {/* Greeting */}
        <div className="px-4 pt-5 pb-1">
          <p className="text-sm text-muted-foreground font-medium">{greeting()}</p>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            Hello, <span className="text-violet-500">{firstName}</span> 🕊️
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Stay intentional. Stay consistent.</p>
        </div>

        <TodayPanel userId={userId} goals={goals} />
        <YearThemeCard />
        <GratitudeCard />
        <HomeQuickNav />
        <CurrentBookCard book={currentBook} />

        {/* Daily Verse */}
        <div className="px-4 mt-5">
          <DailyVerseCard />
        </div>

        {/* Upcoming Goals Countdown */}
        <UpcomingGoalsCountdown />

      </div>
    </div>
  )
}
