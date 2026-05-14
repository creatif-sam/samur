'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import DailyVerseCard from '@/components/meditations/DailyVerse'
import { computeDashboardStats } from '@/components/home/DashboardStats'
import {
  Target, Calendar, BookOpen, NotebookPen,
  BarChart2, Flame, CheckCircle2, ChevronRight,
  Play, Moon, TrendingUp,
} from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const quickLinks = [
  { label: 'Goals',     href: '/protected/goals',       icon: Target,      color: 'bg-violet-500' },
  { label: 'Planner',  href: '/protected/planner',     icon: Calendar,    color: 'bg-blue-500'   },
  { label: 'Meditate', href: '/protected/meditations',  icon: Moon,        color: 'bg-indigo-500' },
  { label: 'Notes',    href: '/protected/note',         icon: NotebookPen, color: 'bg-amber-500'  },
  { label: 'Library',  href: '/protected/readapp',      icon: BookOpen,    color: 'bg-emerald-500'},
  { label: 'Analytics',href: '/protected/analytics',    icon: BarChart2,   color: 'bg-rose-500'   },
]

export default function HomePage() {
  const supabase = createClient()
  const [userName, setUserName]         = useState<string | null>(null)
  const [goals, setGoals]               = useState<Goal[]>([])
  const [meditations, setMeditations]   = useState<{ created_at: string }[]>([])
  const [currentBook, setCurrentBook]   = useState<any | null>(null)
  const [todayPlanner, setTodayPlanner] = useState<any | null>(null)

  const today     = new Date()
  const todayIdx  = today.getDay()

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

      {/* ── GREETING ─────────────────────────────── */}
      <div className="px-4 pt-5 pb-1">
        <p className="text-sm text-muted-foreground font-medium">{greeting()}</p>
        <h1 className="text-3xl font-black tracking-tight leading-none">
          Hello, <span className="text-violet-500">{firstName}</span> 🕊️
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Stay intentional. Stay consistent.</p>
      </div>

      {/* ── MEDITATION STREAK HERO ────────────────── */}
      <div className="px-4 mt-4">
        <Link href="/protected/meditations">
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-xl shadow-violet-900/30">
            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
            <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Meditation Streak</span>
                </div>
                <p className="text-5xl font-black text-white leading-none">
                  {meditationStreak}
                  <span className="text-xl font-semibold text-white/60 ml-1">days</span>
                </p>
                <p className="text-xs text-white/50 pt-1">
                  {meditationStreak > 0 ? "Keep the fire burning 🔥" : "Start your first meditation today"}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
                <span className="text-[10px] text-white/50 font-semibold">Open</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── WEEK CALENDAR STRIP ───────────────────── */}
      <div className="px-4 mt-5">
        <div className="flex justify-between items-center gap-1">
          {DAYS.map((day, i) => {
            const d = new Date(today)
            d.setDate(today.getDate() - todayIdx + i)
            const dayNum  = d.getDate()
            const isToday = i === todayIdx
            return (
              <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wide',
                  isToday ? 'text-violet-500' : 'text-muted-foreground'
                )}>{day}</span>
                <div className={cn(
                  'w-full aspect-square max-w-[40px] rounded-xl flex items-center justify-center text-sm font-black transition-all',
                  isToday
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40'
                    : 'bg-muted/50 text-foreground'
                )}>
                  {dayNum}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── QUICK NAV PILLS ──────────────────────── */}
      <div className="mt-5 px-4">
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {quickLinks.map(({ label, href, icon: Icon, color }) => (
            <Link key={href} href={href} className="flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5 w-16">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground text-center leading-tight">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── TODAY'S HIGHLIGHT CARDS ───────────────── */}
      <div className="mt-5">
        <div className="px-4 mb-3">
          <h3 className="text-base font-black tracking-tight">Today's Highlights</h3>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">

          {/* Planner Card */}
          <Link href="/protected/planner" className="flex-shrink-0 w-48">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-700 p-4 h-44 relative overflow-hidden">
              <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Planner</span>
                </div>
                <div>
                  {todayPlanner?.morning ? (
                    <p className="text-sm font-bold text-white line-clamp-3 italic leading-snug">
                      "{todayPlanner.morning}"
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-white/60">No intention set yet</p>
                  )}
                  {Array.isArray(todayPlanner?.tasks) && todayPlanner.tasks.length > 0 && (
                    <p className="text-[10px] text-white/50 mt-1.5">
                      {todayPlanner.tasks.filter((t: any) => t.completed).length}/{todayPlanner.tasks.length} tasks done
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Top Goal Card */}
          {topGoal ? (
            <Link href="/protected/goals" className="flex-shrink-0 w-48">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 h-44 relative overflow-hidden">
                <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Top Goal</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white line-clamp-2 leading-snug">{topGoal.title}</p>
                    <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${topGoal.progress ?? 0}%` }} />
                    </div>
                    <p className="text-[10px] text-white/50 mt-1">{topGoal.progress ?? 0}% complete</p>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/protected/goals" className="flex-shrink-0 w-48">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 h-44 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20">
                <Target className="w-8 h-8 text-white/50" />
                <p className="text-xs font-bold text-white/60 text-center">No active goals yet. Tap to add one.</p>
              </div>
            </Link>
          )}

          {/* Current Reading Card */}
          {currentBook ? (
            <Link href="/protected/readapp" className="flex-shrink-0 w-48">
              <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 h-44 relative overflow-hidden">
                <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Reading</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white line-clamp-2 leading-snug">{currentBook.title}</p>
                    {currentBook.author && (
                      <p className="text-[10px] text-white/60 mt-0.5">{currentBook.author}</p>
                    )}
                    {currentBook.total_pages > 0 && (
                      <>
                        <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${Math.round(((currentBook.total_pages - (currentBook.pages_remaining ?? 0)) / currentBook.total_pages) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-white/50 mt-1">{currentBook.pages_remaining ?? 0} pages left</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/protected/readapp" className="flex-shrink-0 w-48">
              <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 h-44 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20">
                <BookOpen className="w-8 h-8 text-white/50" />
                <p className="text-xs font-bold text-white/60 text-center">No book in progress. Start reading!</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ── RECENT ACTIVITY ──────────────────────── */}
      <div className="px-4 mt-5">
        <h3 className="text-base font-black tracking-tight mb-3">Recent Activity</h3>
        <div className="space-y-2">
          <ActivityRow
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            iconBg="bg-orange-100 dark:bg-orange-950/40"
            label="Meditation Streak"
            value={`${meditationStreak} day${meditationStreak !== 1 ? 's' : ''}`}
            href="/protected/meditations"
          />
          <ActivityRow
            icon={<Target className="w-5 h-5 text-violet-500" />}
            iconBg="bg-violet-100 dark:bg-violet-950/40"
            label="Active Goals"
            value={`${activeGoals.length} in progress`}
            href="/protected/goals"
          />
          <ActivityRow
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            iconBg="bg-emerald-100 dark:bg-emerald-950/40"
            label="Goals Completed"
            value={`${completedGoals} done`}
            href="/protected/goals"
          />
          <ActivityRow
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            iconBg="bg-blue-100 dark:bg-blue-950/40"
            label="Due Today"
            value={`${stats.todayDue} goal${stats.todayDue !== 1 ? 's' : ''}`}
            href="/protected/planner"
          />
        </div>
      </div>

      {/* ── DAILY VERSE ──────────────────────────── */}
      <div className="px-4 mt-5">
        <DailyVerseCard />
      </div>

    </div>
  )
}

/* ── SUB-COMPONENTS ─────────────────────────── */

function ActivityRow({
  icon, iconBg, label, value, href,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  href: string
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 active:scale-[0.98] transition-all">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <p className="flex-1 text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-foreground">{value}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
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


export default function HomePage() {
  const supabase = createClient()

  const [userName, setUserName] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null)

  const [goals, setGoals] = useState<Goal[]>([])
  const [socialFeedPosts, setSocialFeedPosts] = useState<(Post & { profiles: Profile })[]>([])
  const [todayPlanner, setTodayPlanner] = useState<{
    morning?: string
    reflection?: string
    mood?: string
    tasks?: any[]
  } | null>(null)

  useEffect(() => {
    loadHomeData()
  }, [])

  async function loadHomeData() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    setCurrentUserId(auth.user.id)
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', auth.user.id)
      .single()
    setUserName(profile?.full_name ?? null)

    const { data: plannerData } = await supabase
      .from('planner_days')
      .select('morning, reflection, tasks, mood')
      .eq('user_id', auth.user.id)
      .eq('day', todayStr)
      .maybeSingle()
    setTodayPlanner(plannerData)

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .or(`owner_id.eq.${auth.user.id},partner_id.eq.${auth.user.id}`)
    setGoals(goalsData ?? [])

    const { data: socialFeed } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .neq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(2) 
    setSocialFeedPosts(socialFeed ?? [])
  }

  const stats = computeDashboardStats(goals)

  return (
    // Replaced specific slate bg with theme-aware background
    <div className="p-4 pb-24 space-y-6 max-w-3xl mx-auto bg-background text-foreground transition-colors duration-300">
      
      <HomeHeader userName={userName} weather={weather} />

      <DailyVerseCard />

      <DailyActionWord />
      <DashboardStats stats={stats} />

      <ProgressOverview
        completedToday={goals.filter(g => g.status === 'done' && g.due_date && new Date(g.due_date).toDateString() === new Date().toDateString()).length}
        todayTasks={stats.todayDue}
        completedGoals={goals.filter(g => g.status === 'done').length}
        totalGoals={goals.length}
      />

      {/* 4. Today Focus - Updated for Dark Mode */}
      <Card className="overflow-hidden border-none shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-[32px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Today's Focus</span>
            </div>
            {todayPlanner?.mood && <span className="text-xl">{todayPlanner.mood}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayPlanner ? (
            <>
              {todayPlanner.morning && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} className="text-amber-500" /> Intention
                  </p>
                  <p className="text-sm font-semibold text-foreground italic border-l-4 border-violet-200 dark:border-violet-900 pl-3">
                    "{todayPlanner.morning}"
                  </p>
                </div>
              )}
              {Array.isArray(todayPlanner.tasks) && todayPlanner.tasks.length > 0 ? (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">{todayPlanner.tasks.length} Actions Planned</p>
                    <div className="flex -space-x-1">
                      {todayPlanner.tasks.slice(0, 5).map((t: any, i: number) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full border-2 border-background ${t.completed ? 'bg-green-500' : 'bg-muted'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Next: <span className="text-foreground font-medium">{todayPlanner.tasks.find((t: any) => !t.completed)?.text || 'Done for today! 🎉'}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No actions in timeline yet.</p>
              )}
            </>
          ) : (
            <Link href="/protected/planner/day" className="block p-4 text-center bg-muted/50 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground font-bold hover:bg-muted transition-all">
              ⚠️ No plan for today. Tap to fix this.
            </Link>
          )}
        </CardContent>
      </Card>

      {/* 5. Community Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <h2 className="font-bold text-foreground tracking-tight">Community</h2>
          </div>
          <Link href="/protected/posts" className="text-xs font-bold text-violet-600 dark:text-violet-400">View all</Link>
        </div>
        <div className="space-y-4">
          {socialFeedPosts.length ? (
            socialFeedPosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={currentUserId} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center italic">Checking in on the community...</p>
          )}
        </div>
      </div>

      {/* 6. Shared Goals */}
      <Card className="border-none shadow-sm rounded-[24px] bg-card text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Shared Goals
          </CardTitle>
          <Link href="/protected/goals" className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{goal.title}</p>
                <Badge variant={goal.status === 'done' ? 'default' : 'secondary'} className="capitalize">
                  {goal.status}
                </Badge>
              </div>
              <Progress value={goal.progress} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}