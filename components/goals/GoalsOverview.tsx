'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Ban, CalendarClock, ChevronRight, PartyPopper, Rocket } from 'lucide-react'
import type { Goal } from '@/lib/types'
import type { Vision } from '@/app/protected/goals/page'
import type { GoalCategory } from '@/components/goals/NewGoalForm'
import { cn } from '@/lib/utils'
import type { HelpTopic } from '@/lib/help'
import { inPeriod, isOverdue, type GoalPeriod } from '@/lib/goals'
import { addDays, daysBetween, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { PACE_LABEL, PACE_STYLE, daysLeftLabel, visionPace, visionProgress } from '@/lib/visions'

type Scope = 'week' | 'month' | 'quarter' | 'year'
const SCOPE_PERIOD: Record<Scope, GoalPeriod> = { week: 'weekly', month: 'monthly', quarter: 'quarterly', year: 'yearly' }
const SCOPE_LABEL: Record<Scope, string> = { week: 'This week', month: 'This month', quarter: 'This quarter', year: 'This year' }

const STATUS = [
  { key: 'done', label: 'Done', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'doing', label: 'In progress', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  { key: 'blocked', label: 'Blocked', bar: 'bg-orange-500', dot: 'bg-orange-500' },
  { key: 'to_do', label: 'Not started', bar: 'bg-zinc-300 dark:bg-zinc-600', dot: 'bg-zinc-300 dark:bg-zinc-600' },
] as const

interface Props {
  goals: Goal[]
  visions: Vision[]
  categories: GoalCategory[]
  onOpenVisions: () => void
}

function Ring({ pct, size = 104 }: { pct: number; size?: number }) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/20" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        className="stroke-white transition-[stroke-dashoffset] duration-700"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
      />
    </svg>
  )
}

function SectionTitle({ eyebrow, title, right, help }: { eyebrow: string; title: string; right?: React.ReactNode; help?: HelpTopic }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
        <div className="flex items-center gap-0.5">
          <h3 className="text-base font-black tracking-tight">{title}</h3>
          {help && <HelpTip topic={help} align="left" className="-my-1" />}
        </div>
      </div>
      {right}
    </div>
  )
}

const card = 'rounded-3xl bg-card border border-border/60 shadow-sm p-5'

export function GoalsOverview({ goals, visions, categories, onOpenVisions }: Props) {
  const [scope, setScope] = useState<Scope>('month')
  // Only ever rendered on the client after goals load, so reading the clock here is safe
  const [todayKey] = useState<string | null>(() => toLocalDateKey(new Date()))

  const total = goals.length
  const counts = useMemo(() => {
    const c = { done: 0, doing: 0, blocked: 0, to_do: 0 } as Record<Goal['status'], number>
    goals.forEach(g => { c[g.status] = (c[g.status] ?? 0) + 1 })
    return c
  }, [goals])
  const avgProgress = visionProgress(goals)

  // ── Needs attention ──
  const attention = useMemo(() => {
    if (!todayKey) return []
    const soon = addDays(todayKey, 7)
    const items: { goal: Goal; kind: 'overdue' | 'blocked' | 'soon'; note: string }[] = []
    goals.forEach(g => {
      if (g.status === 'done') return
      const due = g.due_date?.slice(0, 10)
      if (isOverdue(g, todayKey)) {
        const d = daysBetween(due!, todayKey)
        items.push({ goal: g, kind: 'overdue', note: `${d} day${d === 1 ? '' : 's'} late` })
      } else if (g.status === 'blocked') {
        items.push({ goal: g, kind: 'blocked', note: due ? `Due ${parseDateKey(due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Blocked' })
      } else if (due && due <= soon) {
        const d = daysBetween(todayKey, due)
        items.push({ goal: g, kind: 'soon', note: d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days` })
      }
    })
    const rank = { overdue: 0, blocked: 1, soon: 2 }
    return items.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.goal.due_date ?? '9').localeCompare(b.goal.due_date ?? '9'))
  }, [goals, todayKey])

  // ── Period momentum ──
  const scoped = useMemo(
    () => (todayKey ? goals.filter(g => g.due_date && inPeriod(parseDateKey(g.due_date.slice(0, 10)), SCOPE_PERIOD[scope])) : []),
    [goals, scope, todayKey],
  )
  const scopedDone = scoped.filter(g => g.status === 'done').length
  const scopedRate = scoped.length ? Math.round((scopedDone / scoped.length) * 100) : 0

  const chartData = useMemo(() => {
    if (!todayKey) return []
    const now = parseDateKey(todayKey)
    const dueOf = (g: Goal) => parseDateKey(g.due_date!.slice(0, 10))
    const bucket = (label: string, match: (d: Date) => boolean, current: boolean) => {
      const inB = scoped.filter(g => match(dueOf(g)))
      const done = inB.filter(g => g.status === 'done').length
      return { label, done, open: inB.length - done, current }
    }
    if (scope === 'week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
        return bucket(day.toLocaleDateString(undefined, { weekday: 'narrow' }), d => d.getTime() === day.getTime(), day.getTime() === now.getTime())
      })
    }
    if (scope === 'month') {
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const weeks = Math.ceil(days / 7)
      return Array.from({ length: weeks }, (_, i) =>
        bucket(`${i * 7 + 1}–${Math.min(days, i * 7 + 7)}`, d => Math.floor((d.getDate() - 1) / 7) === i, Math.floor((now.getDate() - 1) / 7) === i),
      )
    }
    const months = scope === 'quarter' ? [0, 1, 2].map(i => Math.floor(now.getMonth() / 3) * 3 + i) : Array.from({ length: 12 }, (_, i) => i)
    return months.map(m =>
      bucket(new Date(now.getFullYear(), m, 1).toLocaleDateString(undefined, { month: scope === 'year' ? 'narrow' : 'short' }), d => d.getMonth() === m, now.getMonth() === m),
    )
  }, [scoped, scope, todayKey])

  // ── Categories (period-scoped) ──
  const categoryRows = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; color: string; total: number; done: number }>()
    scoped.forEach(g => {
      const cat = categories.find(c => c.id === g.category_id)
      const key = cat?.id ?? 'general'
      const row = map.get(key) ?? { name: cat?.name ?? 'General', emoji: cat?.emoji ?? '🎯', color: cat?.color ?? '#94a3b8', total: 0, done: 0 }
      row.total += 1
      if (g.status === 'done') row.done += 1
      map.set(key, row)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [scoped, categories])
  const maxCat = Math.max(1, ...categoryRows.map(r => r.total))

  // ── Visions ──
  const visionRows = useMemo(() => {
    if (!todayKey) return []
    return visions
      .filter(v => !v.is_archived)
      .map(v => {
        const vg = goals.filter(g => g.vision_id === v.id)
        const progress = visionProgress(vg)
        return { v, count: vg.length, progress, ...visionPace(progress, v.created_at, v.target_date, todayKey) }
      })
      .sort((a, b) => (a.v.target_date ?? '9999').localeCompare(b.v.target_date ?? '9999'))
  }, [visions, goals, todayKey])

  const headline =
    total === 0 ? 'No goals yet. Set your first one in the Goals tab.'
      : counts.done === total ? 'Every goal is done. Time to dream bigger.'
        : attention.some(a => a.kind === 'overdue') ? `${attention.filter(a => a.kind === 'overdue').length} overdue. A small step today counts.`
          : counts.doing > 0 ? `${counts.doing} goal${counts.doing === 1 ? '' : 's'} in motion. Keep going.`
            : 'Pick one goal and start moving.'

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-5 text-white shadow-xl shadow-violet-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-5">
          <div className="relative">
            <Ring pct={avgProgress} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center leading-none">
                <p className="text-2xl font-black">{avgProgress}%</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/70 mt-1">avg progress</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Overall</p>
            <p className="text-3xl font-black leading-tight">
              {counts.done}<span className="text-white/60 text-xl"> / {total}</span>
            </p>
            <p className="text-xs font-semibold text-white/80">goals completed</p>
            <p className="mt-2 text-xs text-white/90 leading-snug">{headline}</p>
          </div>
        </div>

        {total > 0 && (
          <div className="relative mt-5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/15">
              {STATUS.map(s => counts[s.key] > 0 && (
                <div key={s.key} className={cn(s.bar, 'h-full first:rounded-l-full last:rounded-r-full')} style={{ width: `${(counts[s.key] / total) * 100}%` }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              {STATUS.map(s => (
                <div key={s.key} className="text-center">
                  <p className="text-lg font-black leading-none">{counts[s.key]}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white/75">
                    <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Needs attention ── */}
      {total > 0 && (
        <section className={card}>
          <SectionTitle
            eyebrow="Focus"
            title="Needs attention"
            help="goals.attention"
            right={attention.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{attention.length}</span>}
          />
          {attention.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Nothing overdue, blocked or due this week. You&apos;re on top of it.</p>
            </div>
          ) : (
            <ul className="-mx-2">
              {attention.slice(0, 6).map(({ goal, kind, note }) => {
                const Icon = kind === 'overdue' ? AlertTriangle : kind === 'blocked' ? Ban : CalendarClock
                const tone = kind === 'overdue'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                  : kind === 'blocked'
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300'
                    : 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300'
                return (
                  <li key={goal.id}>
                    <Link href={`/protected/goals/${goal.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-muted/60 active:scale-[0.99]">
                      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{goal.title}</span>
                        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-semibold">{note}</span>
                          {(goal.progress ?? 0) > 0 && <span>· {goal.progress}%</span>}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {attention.length > 6 && <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">+{attention.length - 6} more in the Goals tab</p>}
        </section>
      )}

      {/* ── Period scope ── */}
      <div className="flex gap-1 rounded-2xl bg-muted/50 p-1">
        {(['week', 'month', 'quarter', 'year'] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'flex-1 rounded-xl py-2 text-[11px] font-bold capitalize transition-all',
              scope === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ── Momentum ── */}
        <section className={card}>
          <SectionTitle eyebrow={SCOPE_LABEL[scope]} title="Momentum" help="goals.momentum" />
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Due', value: scoped.length },
              { label: 'Done', value: scopedDone },
              { label: 'Rate', value: `${scopedRate}%` },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-black leading-tight">{s.value}</p>
              </div>
            ))}
          </div>
          {scoped.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No goals due {SCOPE_LABEL[scope].toLowerCase()}.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -28 }} barCategoryGap="25%">
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(124,58,237,0.08)' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(127,127,127,0.2)', fontSize: 12, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" />
                    <Bar dataKey="open" name="Open" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center gap-4 text-[11px] font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Done</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Open</span>
              </div>
            </>
          )}
        </section>

        {/* ── Categories ── */}
        <section className={card}>
          <SectionTitle eyebrow={SCOPE_LABEL[scope]} title="By category" help="goals.categories" />
          {categoryRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No goals due {SCOPE_LABEL[scope].toLowerCase()}.</p>
          ) : (
            <ul className="space-y-3.5">
              {categoryRows.map(r => (
                <li key={r.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-bold">
                      <span>{r.emoji}</span>
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{r.done}/{r.total} done</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="relative h-full rounded-full" style={{ width: `${(r.total / maxCat) * 100}%`, backgroundColor: `${r.color}40` }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.done / r.total) * 100}%`, backgroundColor: r.color }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Visions ── */}
      <section className={card}>
        <SectionTitle
          eyebrow="Long term"
          title="Visions"
          help="goals.overviewVisions"
          right={visionRows.length > 0 && (
            <button onClick={onOpenVisions} className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        />
        {visionRows.length === 0 ? (
          <button onClick={onOpenVisions} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-left transition hover:bg-muted/50">
            <Rocket className="h-5 w-5 shrink-0 text-violet-500" />
            <span className="text-sm font-semibold text-muted-foreground">Cast a vision to give your goals a direction.</span>
          </button>
        ) : (
          <ul className="space-y-4">
            {visionRows.slice(0, 5).map(({ v, count, progress, pace, expected, daysLeft }) => (
              <li key={v.id}>
                <button onClick={onOpenVisions} className="w-full text-left">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg" style={{ backgroundColor: `${v.color}22` }}>
                      {v.emoji || '🎯'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold">{v.title}</p>
                        <span className="shrink-0 text-sm font-black">{progress}%</span>
                      </div>
                      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: v.color }} />
                        {expected !== null && pace !== 'achieved' && pace !== 'overdue' && (
                          <div className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: `${expected}%` }} title={`Expected by today: ${expected}%`} />
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', PACE_STYLE[pace])}>{PACE_LABEL[pace]}</span>
                        <span>{count} goal{count === 1 ? '' : 's'}</span>
                        {daysLeftLabel(daysLeft) && <span>· {daysLeftLabel(daysLeft)}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
