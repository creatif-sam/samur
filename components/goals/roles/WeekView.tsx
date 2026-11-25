'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { trNow } from '@/lib/i18n'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/lib/types'
import { HelpTip } from '@/components/ui/help-tip'
import ScheduleGoalDialog from '@/components/goals/ScheduleGoalDialog'
import { addDays, toLocalDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { NEEDS_UPDATE, groupRolesByCategory, isMissingRoles, loadRocks, sortRoles, weekLabel, weekStart, type Role, type RoleCategory, type WeeklyRock } from '@/lib/roles'

type RoleGoal = Goal & { role_id?: string | null }

// Covey's "sharpen the saw": renewal of body, mind, heart and spirit, kept apart from the roles
const SAW = { id: 'saw', name: 'Sharpen the saw', emoji: '🪚', color: '#0d9488' }

interface Props {
  userId: string
  ready: boolean
  roles: Role[]
  categories?: RoleCategory[]
  goals: RoleGoal[]
  // Rocks can be loaded by the caller (previews); otherwise they come from the database
  initialRocks?: WeeklyRock[]
}

export default function WeekView({ userId, ready, roles, categories = [], goals, initialRocks }: Props) {
  const { tr } = useTranslation()
  const thisWeek = weekStart(toLocalDateKey(new Date()))
  const [week, setWeek] = useState(thisWeek)
  const [rocks, setRocks] = useState<WeeklyRock[]>(initialRocks ?? [])
  const [loading, setLoading] = useState(!initialRocks)
  const [carry, setCarry] = useState<WeeklyRock[]>([])
  const [scheduling, setScheduling] = useState<WeeklyRock | null>(null)

  // Roles in category order (A, B, C…), the same as the Roles tab
  const active = useMemo(() => groupRolesByCategory(sortRoles(roles.filter(r => !r.is_archived)), categories).flatMap(g => g.roles), [roles, categories])
  const goalById = useMemo(() => Object.fromEntries(goals.map(g => [g.id, g])), [goals])

  const load = useCallback(async (w: string) => {
    if (initialRocks) return
    setLoading(true)
    try {
      const supabase = createClient()
      const [now, last] = await Promise.all([loadRocks(supabase, userId, w), loadRocks(supabase, userId, addDays(w, -7))])
      setRocks(now)
      // Unfinished rocks from last week that aren't here yet can be carried forward
      const here = new Set(now.map(r => `${r.role_id}|${r.text.toLowerCase()}`))
      setCarry(last.filter(r => !r.done && !here.has(`${r.role_id}|${r.text.toLowerCase()}`)))
    } catch (err) {
      toast.error(isMissingRoles(err instanceof Error ? err.message : String((err as { message?: string })?.message)) ? NEEDS_UPDATE : trNow('Couldn\'t load this week'))
    } finally {
      setLoading(false)
    }
  }, [userId, initialRocks])

  useEffect(() => { if (ready) void load(week) }, [ready, week, load])

  // Count only the rocks shown: those of active roles, and Sharpen the saw
  const activeIds = new Set(active.map(r => r.id))
  const shownRocks = rocks.filter(r => r.role_id === null || activeIds.has(r.role_id))
  const total = shownRocks.length
  const done = shownRocks.filter(r => r.done).length

  async function add(roleId: string | null, text: string, goalId: string | null = null) {
    const clean = text.trim().slice(0, 200)
    if (!clean) return false
    const sort = rocks.filter(r => r.role_id === roleId).length
    const { data, error } = await createClient().from('weekly_rocks')
      .insert({ owner_id: userId, role_id: roleId, goal_id: goalId, week_start: week, text: clean, sort_order: sort })
      .select('*').single()
    if (error || !data) { toast.error(isMissingRoles(error?.message) ? NEEDS_UPDATE : tr('Couldn\'t add it')); return false }
    setRocks(prev => [...prev, data as WeeklyRock])
    return true
  }

  async function toggle(rock: WeeklyRock) {
    const next = !rock.done
    const doneAt = next ? new Date().toISOString() : null
    setRocks(prev => prev.map(r => (r.id === rock.id ? { ...r, done: next, done_at: doneAt } : r)))
    const { data, error } = await createClient().from('weekly_rocks').update({ done: next, done_at: doneAt }).eq('id', rock.id).select('id')
    if (error || !data?.length) {
      setRocks(prev => prev.map(r => (r.id === rock.id ? rock : r)))
      toast.error(tr('Couldn\'t save that tick'))
    }
  }

  async function remove(rock: WeeklyRock) {
    setRocks(prev => prev.filter(r => r.id !== rock.id))
    const { data, error } = await createClient().from('weekly_rocks').delete().eq('id', rock.id).select('id')
    if (error || !data?.length) {
      setRocks(prev => [...prev, rock])
      toast.error(tr('Couldn\'t remove it'))
    }
  }

  async function carryForward() {
    const supabase = createClient()
    const rows = carry.map((r, i) => ({ owner_id: userId, role_id: r.role_id, goal_id: r.goal_id, week_start: week, text: r.text, sort_order: rocks.length + i }))
    const { data, error } = await supabase.from('weekly_rocks').insert(rows).select('*')
    if (error || !data) { toast.error(tr('Couldn\'t bring them forward')); return }
    setRocks(prev => [...prev, ...(data as WeeklyRock[])])
    setCarry([])
    toast.success(tr('{dataCount} brought forward from last week', { dataCount: data.length }))
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-bold">{tr('Weekly planning is almost ready')}</p>
        <p className="mt-1 text-xs">{tr('It needs the roles database update. Run the roles migration in Supabase.')}</p>
      </div>
    )
  }

  const sections = [
    ...active.map(r => ({ id: r.id, name: r.name, emoji: r.emoji ?? '🎯', color: r.color, roleId: r.id as string | null })),
    { ...SAW, roleId: null as string | null },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setWeek(w => addDays(w, -7))} aria-label={tr('Previous week')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{week === thisWeek ? tr('This week') : week < thisWeek ? tr('Past week') : tr('Coming week')}</p>
            <p className="text-sm font-bold">{weekLabel(week)}</p>
          </div>
          <button onClick={() => setWeek(w => addDays(w, 7))} aria-label={tr('Next week')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-white/80">{tr('{done} of {total} done', { done: done, total: total })}</span>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] leading-snug text-white/70">
          {tr('Put first things first: pick one or two big rocks per role, then book time for them.')}
          <HelpTip topic="goals.week" align="right" tone="onDark" className="-my-1" />
        </p>
      </div>

      {week !== thisWeek && (
        <button onClick={() => setWeek(thisWeek)} className="text-xs font-bold text-violet-600 dark:text-violet-400">{tr('Back to this week')}</button>
      )}

      {carry.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="flex-1 text-xs font-medium">{tr('{carryCount} big {carryCount:rock|rocks} from last week {carryCount:is|are} unfinished.', { carryCount: carry.length })}</p>
          <button onClick={carryForward} className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold text-white">{tr('Bring forward')}</button>
        </div>
      )}

      {active.length === 0 && (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">{tr('Add your roles in the Roles tab first; each one gets its own big rocks here.')}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {sections.map(s => (
            <RoleWeek
              key={s.id}
              section={s}
              rocks={rocks.filter(r => (r.role_id ?? null) === s.roleId)}
              goals={s.roleId ? goals.filter(g => g.role_id === s.roleId && g.status !== 'done' && g.owner_id === userId) : []}
              goalById={goalById}
              onAdd={(text, goalId) => add(s.roleId, text, goalId)}
              onToggle={toggle}
              onRemove={remove}
              onSchedule={setScheduling}
            />
          ))}
        </div>
      )}

      {scheduling && (
        <ScheduleGoalDialog
          goal={{ title: scheduling.text, vision_id: scheduling.goal_id ? goalById[scheduling.goal_id]?.vision_id : undefined }}
          open
          onOpenChange={o => { if (!o) setScheduling(null) }}
        />
      )}
    </div>
  )
}

function RoleWeek({ section, rocks, goals, goalById, onAdd, onToggle, onRemove, onSchedule }: {
  section: { id: string; name: string; emoji: string; color: string; roleId: string | null }
  rocks: WeeklyRock[]
  goals: RoleGoal[]
  goalById: Record<string, RoleGoal>
  onAdd: (text: string, goalId: string | null) => Promise<boolean>
  onToggle: (rock: WeeklyRock) => void
  onRemove: (rock: WeeklyRock) => void
  onSchedule: (rock: WeeklyRock) => void
}) {
  const { tr } = useTranslation()
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const isSaw = section.roleId === null
  // Goals of this role not already a rock this week, offered as one-tap rocks
  const used = new Set(rocks.map(r => r.goal_id).filter(Boolean))
  const fromGoals = goals.filter(g => !used.has(g.id)).slice(0, 3)

  const submit = async (value: string, goalId: string | null = null) => {
    setBusy(true)
    const ok = await onAdd(value, goalId)
    setBusy(false)
    if (ok) { setText(''); setAdding(false) }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base" style={{ backgroundColor: `${section.color}22` }}>{section.emoji}</span>
        <h4 className="min-w-0 flex-1 truncate text-sm font-black">{tr(section.name)}</h4>
        {rocks.length > 0 && <span className="text-[11px] font-bold text-muted-foreground">{rocks.filter(r => r.done).length}/{rocks.length}</span>}
      </div>
      {isSaw && rocks.length === 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{tr('Renewal for body, mind, heart and spirit: rest, exercise, reading, prayer, time with friends.')}</p>
      )}

      {rocks.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {rocks.map(r => (
            <li key={r.id} className="group flex items-center gap-2 rounded-xl px-1 py-1">
              <button role="checkbox" aria-checked={r.done} aria-label={r.text} onClick={() => onToggle(r)}
                className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition', r.done ? 'border-transparent text-white' : 'border-muted-foreground/40')}
                style={r.done ? { backgroundColor: section.color } : undefined}>
                {r.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm leading-snug', r.done && 'text-muted-foreground line-through')}>{r.text}</span>
                {r.goal_id && goalById[r.goal_id] && r.text !== goalById[r.goal_id].title && (
                  <span className="block truncate text-[10px] text-muted-foreground">🎯 {tr(goalById[r.goal_id].title)}</span>
                )}
              </span>
              {!r.done && (
                <button onClick={() => onSchedule(r)} aria-label={tr('Book time for {text}', { text: r.text })} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                  <CalendarPlus className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => onRemove(r)} aria-label={tr('Remove {text}', { text: r.text })} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={e => { e.preventDefault(); void submit(text) }} className="mt-2 flex gap-2">
          <input autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder={isSaw ? tr('e.g. Run three times') : tr('The most important thing this week')}
            className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-violet-400" />
          <button type="submit" disabled={busy || !text.trim()} className="shrink-0 rounded-xl px-3 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: section.color }}>{tr('Add')}</button>
          <button type="button" onClick={() => { setAdding(false); setText('') }} className="shrink-0 px-1 text-xs font-semibold text-muted-foreground">{tr('Cancel')}</button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold hover:bg-muted" style={{ color: section.color }}>
            <Plus className="h-3.5 w-3.5" />{' '}{tr('Big rock')}
          </button>
          {fromGoals.map(g => (
            <button key={g.id} onClick={() => submit(g.title, g.id)} disabled={busy} className="max-w-[12rem] truncate rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              + 🎯 {tr(g.title)}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
