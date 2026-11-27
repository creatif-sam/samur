'use client'

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Target,
  Heart,
  Wallet,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Flame,
  Brain,
  Mountain,
} from 'lucide-react'
import type { Goal } from '@/lib/types'
import WeekBalance from '@/components/planner/WeekBalance'
import WeekView from '@/components/goals/roles/WeekView'
import { hideFinishedRockSessions, loadWeek } from '@/lib/planner/week'
import { isMissingRoles, loadCategories, loadRocks, loadRoles, type Role, type RoleCategory, type WeeklyRock } from '@/lib/roles'
import type { PlannerTask } from '@/lib/planner/tasks'
import { cn } from '@/lib/utils'
import { addDays, toLocalDateKey } from '@/lib/dates'
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
  requestsAnswered: number
  requestsPrayed: number   // different requests prayed for (0 before the prayer update)
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
  const { tr } = useTranslation()
  return (
    <div className={cn('rounded-2xl p-4 flex flex-col gap-2', color)}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">{tr(label)}</p>
      {sub && <p className="text-[11px] text-white/70 leading-tight">{tr(sub)}</p>}
    </div>
  )
}

export default function WeeklyReviewPage() {
  const { tr } = useTranslation()
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const { start: weekStart, end: weekEnd, startStr, endStr } = weekRange()
  const days = dayLabels()

  // Look back by role (time and big rocks), then plan the coming week
  const [userId, setUserId] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [roleCategories, setRoleCategories] = useState<RoleCategory[]>([])
  const [rolesReady, setRolesReady] = useState(false)
  const [roleGoals, setRoleGoals] = useState<Goal[]>([])
  const [weekTasks, setWeekTasks] = useState<PlannerTask[]>([])
  const [allWeekRocks, setWeekRocks] = useState<WeeklyRock[]>([])
  const rolesMap = Object.fromEntries(roles.map(r => [r.id, r]))
  const weekRocks = allWeekRocks.filter(r => r.role_id === null || (!!rolesMap[r.role_id] && !rolesMap[r.role_id].is_archived))
  // On Sunday the new week has just begun: plan it; any other day, plan the next one
  const planWeek = new Date().getDay() === 0 ? startStr : addDays(startStr, 7)

  useEffect(() => { load(); loadRoleWeek() }, [])

  async function loadRoleWeek() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const [rRes, week, rocks, goalsRes] = await Promise.all([
        loadRoles(supabase, user.id),
        loadWeek(supabase, user.id, startStr),
        loadRocks(supabase, user.id, startStr).catch(err => { if (isMissingRoles(err?.message)) return [] as WeeklyRock[]; throw err }),
        supabase.from('goals').select('*').or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`).order('created_at', { ascending: false }),
      ])
      setRoles(rRes.roles)
      setRolesReady(rRes.ready)
      if (rRes.ready) setRoleCategories(await loadCategories(supabase, user.id, rRes.roles.length > 0))
      const doneRocks = new Set(rocks.filter(r => r.done).map(r => r.id))
      setWeekTasks(week.flatMap(d => hideFinishedRockSessions(d.tasks.filter(t => !t.owner_id || t.owner_id === user.id), doneRocks, d.completed)))
      setWeekRocks(rocks)
      setRoleGoals((goalsRes.data ?? []) as Goal[])
      setUserId(user.id)
    } catch (err) {
      console.error('Failed to load the week by role', err)
    }
  }

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

    // Prayer requests answered this week, and how many different ones were prayed for
    const [answeredRes, prayedRes] = await Promise.all([
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'answered')
        .gte('answered_at', weekStart.toISOString()).lt('answered_at', weekEnd.toISOString()),
      supabase.from('prayer_request_prayers').select('request_id')
        .eq('user_id', user.id)
        .gte('prayed_at', weekStart.toISOString()).lt('prayed_at', weekEnd.toISOString()),
    ])
    const requestsAnswered = answeredRes.count ?? 0
    const requestsPrayed = new Set((prayedRes.data ?? []).map(r => r.request_id)).size

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
      requestsAnswered,
      requestsPrayed,
      gratitude: gratitudeRes.data ?? [],
    })
    setLoading(false)
  }

  const { start } = weekRange()
  const weekLabel = start.toLocaleDateString(appLocale() ?? 'en-US', { month: 'long', day: 'numeric' })

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
          <h1 className="text-base font-black">{tr('Weekly Review')}</h1>
          <p className="text-[11px] text-muted-foreground">{tr('Week of {weekLabel}', { weekLabel: weekLabel })}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <HelpTip topic="review.page" />
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{tr('Loading…')}</div>
      ) : !data ? null : (
        <div className="px-4 pt-5 space-y-6 max-w-2xl mx-auto">

          {/* Intro */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white">
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">{tr('This Week\'s Snapshot')}</p>
            <p className="text-2xl font-black leading-tight">
              {data.goals.done > 0 || data.meditations > 0 ? tr('{value} wins this week 🏆', { value: data.goals.done + data.meditations }) : tr('New week, fresh start ✨')}
            </p>
            <p className="text-sm text-white/70 mt-1">{tr('Keep the momentum going.')}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Target className="w-4 h-4 text-white" />}
              label={tr('Goals this week')}
              value={data.goals.total}
              sub={tr('{done} done · {doing} in progress', { done: data.goals.done, doing: data.goals.doing })}
              color="bg-gradient-to-br from-violet-600 to-purple-700"
            />
            <StatCard
              icon={<Heart className="w-4 h-4 text-white" />}
              label={tr('Meditations')}
              value={data.meditations}
              sub="Completed this week"
              color="bg-gradient-to-br from-pink-500 to-rose-600"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-white" />}
              label={tr('Tasks done')}
              value={taskRate !== null ? `${taskRate}%` : data.tasksDone}
              sub={tr('{done} of {total} completed', { done: data.tasksDone, total: data.tasksTotal })}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={<Wallet className="w-4 h-4 text-white" />}
              label={tr('Net money')}
              value={`${data.moneyIn - data.moneyOut >= 0 ? '+' : ''}${(data.moneyIn - data.moneyOut).toFixed(0)}`}
              sub={tr('In {moneyIn} · Out {moneyOut}', { moneyIn: data.moneyIn.toFixed(0), moneyOut: data.moneyOut.toFixed(0) })}
              color="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            <StatCard
              icon={<Flame className="w-4 h-4 text-white" />}
              label={tr('Prayer time')}
              value={data.prayerMinutes >= 60 ? `${Math.floor(data.prayerMinutes / 60)}h ${data.prayerMinutes % 60}m` : `${data.prayerMinutes}m`}
              sub={tr('{n} of 7 days', { n: data.prayerDays })}
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <StatCard
              icon={<Brain className="w-4 h-4 text-white" />}
              label={tr('Memory verses')}
              value={data.versesChosen}
              sub={tr('{n} memorized', { n: data.versesMemorized })}
              color="bg-gradient-to-br from-indigo-500 to-violet-600"
            />
            <StatCard
              icon={<Sparkles className="w-4 h-4 text-white" />}
              label={tr('Prayers answered')}
              value={data.requestsAnswered}
              sub={tr('{n} {n:request|requests} prayed for', { n: data.requestsPrayed })}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
            />
          </div>

          {/* Time per role and big rocks this week */}
          {rolesReady && roles.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{tr('Your roles this week')}</p>
                <HelpTip topic="review.roles" align="left" className="-my-1" />
              </div>
              <WeekBalance tasks={weekTasks} rolesMap={rolesMap} />
              {weekRocks.length > 0 && (
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold">
                    <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
                    {tr('Big rocks: {done} of {total} done', { done: weekRocks.filter(r => r.done).length, total: weekRocks.length })}
                  </p>
                  <ul className="space-y-1">
                    {weekRocks.map(r => {
                      const role = r.role_id ? rolesMap[r.role_id] : null
                      return (
                        <li key={r.id} className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: role?.color ?? '#0d9488' }} />
                          <span className={cn('min-w-0 truncate', r.done ? 'line-through text-muted-foreground' : 'font-semibold')}>{r.text}</span>
                          {r.done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Gratitude highlight */}
          {data.gratitude.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                {tr('Gratitude this week (')}{data.gratitude.length}{' '}{tr('/ 7 days)')}
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
                    {new Date(g.date).toLocaleDateString(appLocale() ?? 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  {[g.entry_1, g.entry_2, g.entry_3].filter(Boolean).map((e, i) => (
                    <p key={i} className="text-[12px] text-foreground/80 pl-2 border-l-2 border-amber-300 dark:border-amber-700">{e}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Plan the coming week by role (Covey: weekly planning) */}
          {rolesReady && userId && roles.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-black text-muted-foreground uppercase tracking-widest">{tr('Plan your week')}</p>
              <WeekView userId={userId} ready={rolesReady} roles={roles} categories={roleCategories} goals={roleGoals} initialWeek={planWeek} />
            </div>
          )}

          {/* Reflection prompt */}
          <div className="rounded-3xl border border-dashed border-violet-300 dark:border-violet-800 p-5 text-center space-y-2">
            <TrendingUp className="w-8 h-8 text-violet-400 mx-auto" />
            <p className="font-bold text-sm">{tr('What will you improve next week?')}</p>
            <p className="text-xs text-muted-foreground">
              {tr('Reflect on your wins and set one intention for next week.')}
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
