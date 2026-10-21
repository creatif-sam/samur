'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Target,
  BookOpen,
  Heart,
  Wallet,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Flame,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toLocalDateKey } from '@/lib/dates'
import { fetchRecurringRows } from '@/lib/planner/queries'
import { expandDays, type PlannerDayRow } from '@/lib/planner/tasks'

interface WeekData {
  goals: { total: number; done: number; doing: number }
  meditations: number
  tasksTotal: number
  tasksDone: number
  booksPages: number
  moneyIn: number
  moneyOut: number
  prayerMinutes: number
  prayerDays: number
  versesChosen: number
  versesMemorized: number
  gratitude: { date: string; entry_1: string; entry_2: string; entry_3: string }[]
}

function weekRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay()) // Sunday
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end, startStr: toLocalDateKey(start), endStr: toLocalDateKey(end) }
}

function dayLabels() {
  const { start } = weekRange()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toLocalDateKey(d)
  })
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className={cn('rounded-2xl p-4 flex flex-col gap-2', color)}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-white/70 leading-tight">{sub}</p>}
    </div>
  )
}

export default function WeeklyReviewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const { start: weekStart, end: weekEnd, startStr, endStr } = weekRange()
  const days = dayLabels()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only count days up to today; future planned tasks aren't missed yet
    const today = toLocalDateKey(new Date())
    const lastDay = days[6] < today ? days[6] : today

    const [goalsRes, meditationsRes, plannerRes, , moneyRes, gratitudeRes, recurringRows, prayerRes, versesRes] = await Promise.all([
      supabase.from('goals')
        .select('status, due_date, created_at')
        .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString()),

      supabase.from('meditations')
        .select('id')
        .eq('author_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString()),

      supabase.from('planner_days')
        .select('day, user_id, tasks, completed_task_ids')
        .eq('user_id', user.id)
        .in('day', days),

      supabase.from('readings')
        .select('total_pages, pages_remaining')
        .eq('user_id', user.id)
        .eq('status', 'reading'),

      supabase.from('money_entries')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('entry_date', startStr)
        .lt('entry_date', endStr),

      supabase.from('gratitude_entries')
        .select('date, entry_1, entry_2, entry_3')
        .eq('user_id', user.id)
        .gte('date', startStr)
        .lt('date', endStr)
        .order('date', { ascending: true }),

      fetchRecurringRows(supabase, [user.id], lastDay).catch(() => [] as PlannerDayRow[]),

      supabase.from('prayer_sessions')
        .select('date, duration_seconds')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('date', startStr)
        .lt('date', endStr),

      supabase.from('memory_verses')
        .select('reference, memorized')
        .eq('user_id', user.id)
        .gte('day', startStr)
        .lt('day', endStr),
    ])

    // Prayer and memory verses
    const prayer = prayerRes.data ?? []
    const prayerMinutes = Math.round(prayer.reduce((a, p) => a + (p.duration_seconds ?? 0), 0) / 60)
    const prayerDays = new Set(prayer.map(p => p.date)).size
    const verses = versesRes.data ?? []

    // Goals
    const goals = goalsRes.data ?? []
    const goalData = {
      total: goals.length,
      done: goals.filter(g => g.status === 'done').length,
      doing: goals.filter(g => g.status === 'doing').length,
    }

    // Planner tasks
    let tasksTotal = 0; let tasksDone = 0
    for (const day of expandDays({
      userId: user.id,
      rows: (plannerRes.data ?? []) as PlannerDayRow[],
      recurringRows,
      from: days[0],
      to: lastDay,
    })) {
      tasksTotal += day.tasks.length
      tasksDone += day.tasks.filter(t => t.completed).length
    }

    // Money
    const money = moneyRes.data ?? []
    const moneyIn = money.filter(m => m.type === 'income').reduce((a, b) => a + (b.amount ?? 0), 0)
    const moneyOut = money.filter(m => m.type === 'expense').reduce((a, b) => a + (b.amount ?? 0), 0)

    setData({
      goals: goalData,
      meditations: meditationsRes.data?.length ?? 0,
      tasksTotal,
      tasksDone,
      booksPages: 0, // placeholder — pages read this week not easily tracked without a log table
      moneyIn,
      moneyOut,
      prayerMinutes,
      prayerDays,
      versesChosen: new Set(verses.map(v => v.reference)).size,
      versesMemorized: verses.filter(v => v.memorized).length,
      gratitude: gratitudeRes.data ?? [],
    })
    setLoading(false)
  }

  const { start } = weekRange()
  const weekLabel = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const taskRate = data && data.tasksTotal > 0
    ? Math.round((data.tasksDone / data.tasksTotal) * 100)
    : null

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-black">Weekly Review</h1>
          <p className="text-[11px] text-muted-foreground">Week of {weekLabel}</p>
        </div>
        <div className="ml-auto">
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
      ) : !data ? null : (
        <div className="px-4 pt-5 space-y-6 max-w-2xl mx-auto">

          {/* Intro */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white">
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">This Week's Snapshot</p>
            <p className="text-2xl font-black leading-tight">
              {data.goals.done > 0 || data.meditations > 0
                ? `${data.goals.done + data.meditations} wins this week 🏆`
                : 'New week, fresh start ✨'}
            </p>
            <p className="text-sm text-white/70 mt-1">Keep the momentum going.</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Target className="w-4 h-4 text-white" />}
              label="Goals this week"
              value={data.goals.total}
              sub={`${data.goals.done} done · ${data.goals.doing} in progress`}
              color="bg-gradient-to-br from-violet-600 to-purple-700"
            />
            <StatCard
              icon={<Heart className="w-4 h-4 text-white" />}
              label="Meditations"
              value={data.meditations}
              sub="Completed this week"
              color="bg-gradient-to-br from-pink-500 to-rose-600"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-white" />}
              label="Tasks done"
              value={taskRate !== null ? `${taskRate}%` : data.tasksDone}
              sub={`${data.tasksDone} of ${data.tasksTotal} completed`}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={<Wallet className="w-4 h-4 text-white" />}
              label="Net money"
              value={`${data.moneyIn - data.moneyOut >= 0 ? '+' : ''}${(data.moneyIn - data.moneyOut).toFixed(0)}`}
              sub={`In ${data.moneyIn.toFixed(0)} · Out ${data.moneyOut.toFixed(0)}`}
              color="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            <StatCard
              icon={<Flame className="w-4 h-4 text-white" />}
              label="Prayer time"
              value={data.prayerMinutes >= 60 ? `${Math.floor(data.prayerMinutes / 60)}h ${data.prayerMinutes % 60}m` : `${data.prayerMinutes}m`}
              sub={`${data.prayerDays} of 7 days`}
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <StatCard
              icon={<Brain className="w-4 h-4 text-white" />}
              label="Memory verses"
              value={data.versesChosen}
              sub={`${data.versesMemorized} memorized`}
              color="bg-gradient-to-br from-indigo-500 to-violet-600"
            />
          </div>

          {/* Gratitude highlight */}
          {data.gratitude.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                Gratitude this week ({data.gratitude.length} / 7 days)
              </p>

              {/* Mini progress bar */}
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(start)
                  d.setDate(start.getDate() + i)
                  const ds = toLocalDateKey(d)
                  const filled = data.gratitude.some(g => g.date === ds)
                  return (
                    <div
                      key={i}
                      className={cn('flex-1 h-2 rounded-full', filled ? 'bg-amber-400' : 'bg-muted')}
                    />
                  )
                })}
              </div>

              {data.gratitude.map(g => (
                <div key={g.date} className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-wide">
                    {new Date(g.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  {[g.entry_1, g.entry_2, g.entry_3].filter(Boolean).map((e, i) => (
                    <p key={i} className="text-[12px] text-foreground/80 pl-2 border-l-2 border-amber-300 dark:border-amber-700">{e}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Reflection prompt */}
          <div className="rounded-3xl border border-dashed border-violet-300 dark:border-violet-800 p-5 text-center space-y-2">
            <TrendingUp className="w-8 h-8 text-violet-400 mx-auto" />
            <p className="font-bold text-sm">What will you improve next week?</p>
            <p className="text-xs text-muted-foreground">
              Reflect on your wins and set one intention for next week.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
