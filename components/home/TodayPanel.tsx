'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Brain, CalendarClock, Check, ChevronDown, ChevronRight, Flame, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDays, toLocalDateKey } from '@/lib/dates'
import { fetchRecurringRows } from '@/lib/planner/queries'
import { expandDays, parseMinutes, sortByStart, type PlannerDayRow, type PlannerTask } from '@/lib/planner/tasks'
import { HABITS, currentStreak, lastNDays, type HabitKey } from '@/lib/habits'
import { isReviewDue, type MemoryVerse } from '@/lib/meditations/memoryVerse'
import { dayReading, formatReading, getPlan, planStatus, type PlanEnrollment } from '@/lib/bible/plans'
import { isOverdue, sortGoals } from '@/lib/goals'
import type { Goal } from '@/lib/types'
import PartnerCheckinCard from './PartnerCheckinCard'

const HISTORY_DAYS = 60

type HabitData = Record<HabitKey, Set<string>>

// One place that answers "what do I do today?", built from data the app already has
export default function TodayPanel({ userId, goals }: { userId: string | null; goals: Goal[] }) {
  const supabase = createClient()
  const now = new Date()
  const today = toLocalDateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [habits, setHabits] = useState<HabitData | null>(null)
  const [reviewsDue, setReviewsDue] = useState(0)
  const [hasVerseToday, setHasVerseToday] = useState(false)
  const [plan, setPlan] = useState<{ title: string; label: string; first: { book: string; chapter: number } | null; behind: number; finished: boolean } | null>(null)
  const [showStreaks, setShowStreaks] = useState(false)

  useEffect(() => {
    if (!userId) return
    const since = addDays(today, -HISTORY_DAYS)
    const sinceIso = new Date(`${since}T00:00:00`).toISOString()
    const keyOf = (ts: string) => toLocalDateKey(new Date(ts))

    ;(async () => {
      const [dayRes, recurring, prayer, meditations, readingLogs, bible, verses, plans] = await Promise.all([
        supabase.from('planner_days').select('day, user_id, tasks, completed_task_ids').eq('user_id', userId).eq('day', today).maybeSingle(),
        fetchRecurringRows(supabase, [userId], today).catch(() => [] as PlannerDayRow[]),
        supabase.from('prayer_sessions').select('date').eq('user_id', userId).eq('completed', true).gte('date', since),
        supabase.from('meditations').select('created_at').eq('author_id', userId).gte('created_at', sinceIso),
        supabase.from('reading_logs').select('reading_date').eq('user_id', userId).gte('reading_date', since),
        supabase.from('bible_reading_log').select('day').eq('user_id', userId).gte('day', since),
        supabase.from('memory_verses').select('*').eq('user_id', userId).order('day', { ascending: false }).limit(60),
        supabase.from('bible_plans').select('*').eq('user_id', userId),
      ])

      const [todayTasks] = expandDays({
        userId,
        rows: dayRes.data ? [dayRes.data as PlannerDayRow] : [],
        recurringRows: recurring,
        from: today,
        to: today,
      })
      setTasks(todayTasks.tasks)

      const verseRows = (verses.data ?? []) as MemoryVerse[]
      setHasVerseToday(verseRows.some(v => v.day === today))
      setReviewsDue(verseRows.filter(v => isReviewDue(v, today)).length)

      setHabits({
        prayer: new Set((prayer.data ?? []).map((r: { date: string }) => r.date)),
        meditation: new Set((meditations.data ?? []).map((r: { created_at: string }) => keyOf(r.created_at))),
        reading: new Set((readingLogs.data ?? []).map((r: { reading_date: string }) => r.reading_date)),
        bible: new Set((bible.data ?? []).map((r: { day: string }) => r.day)),
        verse: new Set(verseRows.map(v => v.day)),
      })

      // First active reading plan that still has days left
      for (const e of (plans.data ?? []) as PlanEnrollment[]) {
        const p = getPlan(e.plan_key)
        if (!p) continue
        const status = planStatus(p, e, today)
        if (status.finished) continue
        const chapters = dayReading(p, status.nextDay!)
        setPlan({
          title: p.title,
          label: status.caughtUpToday ? "Today's reading done ✓" : formatReading(chapters),
          first: status.caughtUpToday ? null : chapters[0] ?? null,
          behind: status.behind,
          finished: false,
        })
        break
      }
    })()
  }, [userId])

  const upcoming = useMemo(() => {
    const open = tasks.filter(t => !t.completed)
    return sortByStart(open).filter(t => parseMinutes(t.end) > nowMinutes || parseMinutes(t.end) <= parseMinutes(t.start)).slice(0, 3)
  }, [tasks, nowMinutes])
  const doneCount = tasks.filter(t => t.completed).length

  const dueGoals = useMemo(() => {
    const weekAhead = addDays(today, 7)
    return sortGoals(goals.filter(g => g.status !== 'done' && g.due_date && g.due_date.slice(0, 10) <= weekAhead)).slice(0, 3)
  }, [goals, today])

  const habitRows = habits
    ? HABITS.map(h => ({ ...h, done: habits[h.key].has(today), streak: currentStreak(habits[h.key], today) }))
    : []
  const habitsDone = habitRows.filter(h => h.done).length

  if (!userId) return null

  return (
    <section className="px-4 mt-4 space-y-3">
      <div className="rounded-3xl bg-card dark:bg-zinc-900/60 border border-border/60 shadow-sm p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-black tracking-tight">Today</h2>
          <span className="text-xs text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Habits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Daily rhythm{habits ? ` · ${habitsDone}/${HABITS.length}` : ''}
            </p>
            <button onClick={() => setShowStreaks(s => !s)} className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
              Streaks <ChevronDown className={`w-3 h-3 transition-transform ${showStreaks ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(habits ? habitRows : HABITS.map(h => ({ ...h, done: false, streak: 0 }))).map(h => (
              <Link
                key={h.key}
                href={h.href}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition active:scale-95 ${h.done ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-muted/50'}`}
              >
                <span className="relative text-xl leading-none">
                  {h.emoji}
                  {h.done && <Check className="absolute -right-2 -bottom-1 w-3.5 h-3.5 text-white bg-emerald-500 rounded-full p-0.5" />}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground text-center leading-tight">{h.label}</span>
                <span className={`text-[10px] font-black flex items-center gap-0.5 ${h.streak > 0 ? 'text-orange-500' : 'text-muted-foreground/50'}`}>
                  <Flame className="w-3 h-3" />{h.streak}
                </span>
              </Link>
            ))}
          </div>

          {/* 14-day streak view */}
          {showStreaks && habits && (
            <div className="mt-3 space-y-1.5">
              {HABITS.map(h => {
                const days = lastNDays(today, 14)
                return (
                  <div key={h.key} className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-semibold text-muted-foreground truncate">{h.emoji} {h.label}</span>
                    <div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5">
                      {days.map(d => (
                        <span
                          key={d}
                          title={d}
                          className={`aspect-square rounded-[3px] ${habits[h.key].has(d) ? 'bg-emerald-500' : d === today ? 'bg-muted ring-1 ring-violet-400' : 'bg-muted'}`}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              <p className="text-[10px] text-muted-foreground">Last 14 days. A streak keeps going until the end of today.</p>
            </div>
          )}
        </div>

        {/* Planner */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Next up{tasks.length ? ` · ${doneCount}/${tasks.length} done` : ''}
            </p>
            <Link href="/protected/planner" className="text-[11px] font-bold text-violet-600 dark:text-violet-400">Planner</Link>
          </div>
          {upcoming.length === 0 ? (
            <Link href="/protected/planner" className="flex items-center gap-2 rounded-2xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              <CalendarClock className="w-4 h-4" />
              {tasks.length === 0 ? 'Nothing planned yet. Plan your day' : 'All done for today 🎉'}
            </Link>
          ) : (
            <ul className="space-y-1">
              {upcoming.map(t => (
                <li key={t.id}>
                  <Link href="/protected/planner" className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2">
                    <span className="text-[11px] font-bold tabular-nums text-violet-600 dark:text-violet-400 w-11 shrink-0">{t.start}</span>
                    <span className="text-sm font-semibold truncate flex-1">{t.text}</span>
                    {parseMinutes(t.start) <= nowMinutes && <span className="text-[9px] font-black uppercase text-emerald-600">Now</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bible plan and memory verse */}
        {(plan || reviewsDue > 0 || !hasVerseToday) && (
          <div className="grid grid-cols-1 gap-1.5">
            {plan ? (
              <Link
                href={plan.first ? `/protected/bible?book=${encodeURIComponent(plan.first.book)}&chapter=${plan.first.chapter}` : '/protected/bible?view=plans'}
                className="flex items-center gap-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 px-3 py-2.5"
              >
                <BookOpen className="w-4 h-4 text-violet-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 truncate">
                    {plan.title}{plan.behind > 0 ? ` · ${plan.behind} behind` : ''}
                  </p>
                  <p className="text-sm font-semibold truncate">{plan.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ) : (
              <Link href="/protected/bible?view=plans" className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" /> Start a Bible reading plan
              </Link>
            )}
            {(reviewsDue > 0 || !hasVerseToday) && (
              <Link href="/protected/posts?tab=meditations" className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
                <Brain className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="text-sm font-semibold flex-1">
                  {!hasVerseToday ? "Choose today's memory verse" : ''}
                  {!hasVerseToday && reviewsDue > 0 ? ' · ' : ''}
                  {reviewsDue > 0 ? `${reviewsDue} verse${reviewsDue > 1 ? 's' : ''} to review` : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        )}

        {/* Goals due this week */}
        {dueGoals.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Goals due this week</p>
            <ul className="space-y-1">
              {dueGoals.map(g => (
                <li key={g.id}>
                  <Link href={`/protected/goals/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2">
                    <Target className={`w-4 h-4 shrink-0 ${isOverdue(g) ? 'text-red-500' : 'text-violet-600'}`} />
                    <span className="text-sm font-semibold truncate flex-1">{g.title}</span>
                    <span className={`text-[10px] font-bold ${isOverdue(g) ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {isOverdue(g) ? 'Overdue' : g.due_date!.slice(0, 10) === today ? 'Today' : new Date(`${g.due_date!.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PartnerCheckinCard userId={userId} />
    </section>
  )
}
