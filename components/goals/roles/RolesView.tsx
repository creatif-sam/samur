'use client'

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronDown, MoreHorizontal, Pencil, Plus, Settings2, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/lib/types'
import type { Vision } from '@/app/protected/goals/page'
import type { GoalCategory } from '@/components/goals/NewGoalForm'
import { VisionListView } from '@/components/goals/VisionListView'
import { VisionCreator } from '@/components/goals/VisionCreator'
import { HelpTip } from '@/components/ui/help-tip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { isOverdue, sortGoals } from '@/lib/goals'
import { parseDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { NEEDS_UPDATE, groupGoals, groupRolesByCategory, isMissingRoles, roleProgress, sortRoles, tooManyRoles, ROLE_SOFT_LIMIT, type Role, type RoleCategory } from '@/lib/roles'
import RoleEditor from './RoleEditor'
import CategoryManager from './CategoryManager'

type RoleGoal = Goal & { role_id?: string | null }

interface Props {
  userId: string
  ready: boolean
  roles: Role[]
  roleCategories: RoleCategory[]
  goals: RoleGoal[]
  visions: Vision[]
  categories: GoalCategory[]
  onRolesChange: (roles: Role[]) => void
  onCategoriesChange: (categories: RoleCategory[]) => void
  onGoalsMoved: (goalIds: string[], roleId: string) => void
  onAddGoal: (roleId: string) => void
  onRefresh: () => void
  // Set when arriving from a vision on the Overview, to open the visions section
  openVisions?: number
}

export default function RolesView({ userId, ready, roles, roleCategories, openVisions, goals, visions, categories, onRolesChange, onCategoriesChange, onGoalsMoved, onAddGoal, onRefresh }: Props) {
  const { tr } = useTranslation()
  const [addingIn, setAddingIn] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [busy, setBusy] = useState(false)
  const [showVisions, setShowVisions] = useState(false)
  useEffect(() => { if (openVisions) setShowVisions(true) }, [openVisions])
  const [showArchived, setShowArchived] = useState(false)

  const active = useMemo(() => sortRoles(roles.filter(r => !r.is_archived)), [roles])
  const byCategory = useMemo(() => groupRolesByCategory(active, roleCategories), [active, roleCategories])
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of roles) if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
    return counts
  }, [roles])
  const archived = useMemo(() => roles.filter(r => r.is_archived), [roles])
  // Only active roles hold goals here; an archived role's goals wait under Unassigned to be refiled
  const groups = useMemo(() => groupGoals(goals, userId, active), [goals, userId, active])
  const visionById = useMemo(() => Object.fromEntries(visions.map(v => [v.id, v])), [visions])

  const replaceRole = (role: Role) => onRolesChange(roles.some(r => r.id === role.id) ? roles.map(r => (r.id === role.id ? role : r)) : [...roles, role])

  async function updateRole(role: Role, values: Partial<Role>) {
    const { data, error } = await createClient().from('roles').update(values).eq('id', role.id).select('*').single()
    if (error || !data) { toast.error(isMissingRoles(error?.message) ? NEEDS_UPDATE : tr('Couldn\'t update the role')); return false }
    replaceRole(data as Role)
    return true
  }

  // Swap places with the neighbour, then save the whole order so it stays tidy
  async function move(role: Role, list: Role[], dir: -1 | 1) {
    const i = list.findIndex(r => r.id === role.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const order = [...list]
    ;[order[i], order[j]] = [order[j], order[i]]
    const supabase = createClient()
    const results = await Promise.all(order.map((r, idx) => supabase.from('roles').update({ sort_order: idx }).eq('id', r.id).select('id')))
    if (results.some(r => r.error || !r.data?.length)) { toast.error(tr('Couldn\'t reorder')); return }
    onRolesChange(roles.map(r => {
      const idx = order.findIndex(o => o.id === r.id)
      return idx >= 0 ? { ...r, sort_order: idx } : r
    }))
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    const { data, error } = await createClient().from('roles').delete().eq('id', deleting.id).select('id')
    setBusy(false)
    if (error || !data?.length) { toast.error(tr('Couldn\'t delete the role')); return }
    // Its goals lose their role in the database (on delete set null); mirror that here
    onRolesChange(roles.filter(r => r.id !== deleting.id))
    onRefresh()
    toast.success(tr('{name} deleted. Its goals are under Unassigned.', { name: deleting.name }))
    setDeleting(null)
  }

  async function moveGoals(ids: string[], roleId: string) {
    if (!ids.length || !roleId) return
    const { data, error } = await createClient().from('goals').update({ role_id: roleId }).in('id', ids).select('id')
    if (error || !data?.length) { toast.error(isMissingRoles(error?.message) ? NEEDS_UPDATE : tr('Couldn\'t move the goals')); return }
    onGoalsMoved(data.map(r => r.id as string), roleId)
    const role = roles.find(r => r.id === roleId)
    toast.success(tr('{dataCount} {dataCount:goal|goals} moved to {value2} {value3}', { dataCount: data.length, value2: role?.emoji ?? '', value3: role?.name ?? tr('the role') }))
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">{tr('Roles are almost ready')}</p>
          <p className="mt-1 text-xs leading-relaxed">{tr('They need a quick database update: run the roles migration in Supabase. Your goals and visions keep working meanwhile.')}</p>
        </div>
        <LegacyVisions open={showVisions} onToggle={() => setShowVisions(v => !v)} goals={goals} visions={visions} categories={categories} userId={userId} onRefresh={onRefresh} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1 text-sm font-black uppercase">
            {tr('Your roles')}{' '}<HelpTip topic="goals.roles" align="left" className="-my-1" />
          </h3>
          <p className="text-[11px] text-muted-foreground">{tr('Each role has its own mission, vision and goals.')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => setManaging(true)} aria-label={tr('Manage categories')} className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground">
            <Settings2 className="h-4 w-4" />
          </button>
          <button onClick={() => { setAddingIn(null); setCreating(true) }} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white active:scale-95">
            <Plus className="h-4 w-4" />{' '}{tr('Role')}
          </button>
        </div>
      </div>

      {/* Why the page is built around roles */}
      <aside className="rounded-2xl border-l-4 border-violet-400 bg-violet-50/70 px-3.5 py-2.5 dark:border-violet-600 dark:bg-violet-950/25">
        <p className="font-serif text-[13px] italic leading-relaxed text-foreground/80">
          {tr('We believe vision starts with identity: who you are before what you do. Inspired by Stephen R. Covey\'s')}{' '}
          <span className="not-italic font-semibold">{tr('The 7 Habits of Highly Effective People')}</span>{tr(', every goal here grows out of a role you live in.')}
        </p>
      </aside>

      {active.length === 0 && roleCategories.length === 0 && (
        <button onClick={() => setCreating(true)} className="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5 text-left dark:border-violet-800 dark:bg-violet-950/20">
          <p className="text-sm font-bold">{tr('Start with the roles you live in')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr('For example Disciple, Spouse, Parent, Professional. Then give each one a mission, a vision and a few goals.')}</p>
        </button>
      )}

      {tooManyRoles(active.length) && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {tr('You have {activeCount} roles. Covey suggests about {ROLE_SOFT_LIMIT} so each gets real attention; consider joining or archiving some.', { activeCount: active.length, ROLE_SOFT_LIMIT: ROLE_SOFT_LIMIT })}
        </p>
      )}

      <div className="space-y-6">
        {byCategory.map(group => (
          <section key={group.category?.id ?? 'other'} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wider">
                {group.category ? `${group.category.emoji ?? ''} ${tr(group.category.name)}` : tr('Other roles')}
              </h4>
              {group.category && (
                <button onClick={() => { setAddingIn(group.category!.id); setCreating(true) }} className="flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[11px] font-bold text-violet-600 hover:bg-muted dark:text-violet-400">
                  <Plus className="h-3.5 w-3.5" />{' '}{tr('Role')}
                </button>
              )}
            </div>
            {group.roles.length === 0 && (
              <button onClick={() => { setAddingIn(group.category?.id ?? null); setCreating(true) }} className="w-full rounded-2xl border border-dashed border-border px-3 py-3 text-left text-xs text-muted-foreground hover:text-foreground">
                {tr('No roles here yet. Add one.')}
              </button>
            )}
            {group.roles.map((role, i) => (
              <RoleCard
                key={role.id}
                role={role}
                goals={groups.byRole[role.id] ?? []}
                first={i === 0}
                last={i === group.roles.length - 1}
                onEdit={() => setEditing(role)}
                onAddGoal={() => onAddGoal(role.id)}
                onMove={dir => move(role, group.roles, dir)}
                onArchive={() => updateRole(role, { is_archived: true }).then(ok => ok && toast.success(tr('{name} archived', { name: role.name })))}
                onDelete={() => setDeleting(role)}
              />
            ))}
          </section>
        ))}
      </div>

      {/* Goals with no role yet (from before roles), grouped by their vision */}
      {groups.unassignedCount > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="flex items-center gap-1 text-sm font-black uppercase">
              {tr('Unassigned')}{' '}<span className="text-muted-foreground">· {groups.unassignedCount}</span>
              <HelpTip topic="goals.unassigned" align="left" className="-my-1" />
            </h3>
            <p className="text-[11px] text-muted-foreground">{tr('Goals without a role yet. Move them into the role they serve.')}</p>
          </div>
          {Object.entries(groups.unassigned).map(([visionId, list]) => {
            const vision = visionId ? visionById[visionId] : null
            return (
              <div key={visionId || 'none'} className="rounded-2xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-bold">
                    {vision ? `${vision.emoji ?? '✨'} ${vision.title}` : tr('No vision')} <span className="font-medium text-muted-foreground">· {list.length}</span>
                  </p>
                  {active.length > 0 && (
                    <RoleSelect label={tr('Move all to')} roles={active} onPick={roleId => moveGoals(list.map(g => g.id), roleId)} />
                  )}
                </div>
                <ul className="space-y-1">
                  {sortGoals(list).map(g => (
                    <li key={g.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1"><GoalRow goal={g} /></div>
                      {active.length > 0 && <RoleSelect label={tr('Move')} roles={active} onPick={roleId => moveGoals([g.id], roleId)} compact />}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {active.length === 0 && <p className="text-xs text-muted-foreground">{tr('Add a role first, then move these goals into it.')}</p>}
        </section>
      )}

      {groups.shared.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-black uppercase"><Users className="h-4 w-4" />{' '}{tr('Shared with you')}{' '}<span className="text-muted-foreground">· {groups.shared.length}</span></h3>
          <p className="text-[11px] text-muted-foreground">{tr('Your partner\'s goals that you share. They sit in your partner\'s roles.')}</p>
          <ul className="space-y-1 rounded-2xl border border-border bg-card p-3">
            {sortGoals(groups.shared).map(g => <li key={g.id}><GoalRow goal={g} /></li>)}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <section>
          <button onClick={() => setShowArchived(s => !s)} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {tr('Archived roles ·')}{' '}{archived.length} <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showArchived && 'rotate-180')} />
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-1.5">
              {archived.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{r.emoji} {tr(r.name)}{(() => { const n = goals.filter(g => g.role_id === r.id && g.owner_id === userId).length; return n ? <span className="text-xs text-muted-foreground">{tr('· {n} {n:goal|goals} under Unassigned', { n: n })}</span> : null })()}</span>
                  <button onClick={() => updateRole(r, { is_archived: false, sort_order: active.length }).then(ok => ok && toast.success(tr('{name} restored', { name: r.name })))} className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                    <ArchiveRestore className="h-3.5 w-3.5" />{' '}{tr('Restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <LegacyVisions open={showVisions} onToggle={() => setShowVisions(v => !v)} goals={goals} visions={visions} categories={categories} userId={userId} onRefresh={onRefresh} />

      <RoleEditor
        open={creating || !!editing}
        role={editing}
        userId={userId}
        activeCount={active.length}
        existingNames={roles.map(r => r.name)}
        categories={roleCategories}
        initialCategoryId={addingIn}
        onClose={() => { setCreating(false); setEditing(null) }}
        onSaved={role => { replaceRole(role); setCreating(false); setEditing(null) }}
      />

      <CategoryManager
        open={managing}
        userId={userId}
        categories={roleCategories}
        roleCounts={roleCounts}
        onClose={() => setManaging(false)}
        onChange={onCategoriesChange}
      />

      <Dialog open={!!deleting} onOpenChange={o => { if (!o && !busy) setDeleting(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr('Delete {name}?', { name: deleting?.name })}</DialogTitle>
            <DialogDescription>
              {tr('Its goals are kept and move to Unassigned. Its weekly big rocks are deleted. To keep everything, archive the role instead.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>{tr('Cancel')}</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>{busy ? tr('Deleting…') : tr('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoleCard({ role, goals, first, last, onEdit, onAddGoal, onMove, onArchive, onDelete }: {
  role: Role
  goals: RoleGoal[]
  first: boolean
  last: boolean
  onEdit: () => void
  onAddGoal: () => void
  onMove: (dir: -1 | 1) => void
  onArchive: () => void
  onDelete: () => void
}) {
  const { tr } = useTranslation()
  const [open, setOpen] = useState(false)
  const progress = roleProgress(goals)
  const done = goals.filter(g => g.status === 'done').length
  const sorted = sortGoals(goals)
  const shown = open ? sorted : sorted.filter(g => g.status !== 'done').slice(0, 3)

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: role.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ backgroundColor: `${role.color}22` }}>{role.emoji ?? '🎯'}</span>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-base font-black">{tr(role.name)}</h4>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {goals.length ? tr('{goalsCount} {goalsCount:goal|goals} · {done} done{value2}', { goalsCount: goals.length, done: done, value2: progress !== null ? ` · ${progress}%` : '' }) : tr('No goals yet')}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label={tr('{name} options', { name: role.name })} className="-m-1 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />{' '}{tr('Edit role')}</DropdownMenuItem>
              {!first && <DropdownMenuItem onClick={() => onMove(-1)}><ArrowUp className="mr-2 h-4 w-4" />{' '}{tr('Move up')}</DropdownMenuItem>}
              {!last && <DropdownMenuItem onClick={() => onMove(1)}><ArrowDown className="mr-2 h-4 w-4" />{' '}{tr('Move down')}</DropdownMenuItem>}
              <DropdownMenuItem onClick={onArchive}><Archive className="mr-2 h-4 w-4" />{' '}{tr('Archive')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />{' '}{tr('Delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {progress !== null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: role.color }} />
          </div>
        )}

        {(role.mission || role.vision) ? (
          <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
            {role.mission && <Statement label={tr('Mission')} text={role.mission} />}
            {role.vision && <Statement label={tr('Vision')} text={role.vision} />}
          </div>
        ) : (
          <button onClick={onEdit} className="mt-3 w-full rounded-2xl border border-dashed border-border px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:text-foreground">
            {tr('+ Write the mission and vision for this role')}
          </button>
        )}

        {shown.length > 0 && (
          <ul className="mt-3 space-y-1">
            {shown.map(g => <li key={g.id}><GoalRow goal={g} /></li>)}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <button onClick={onAddGoal} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-bold hover:bg-muted" style={{ color: role.color }}>
            <Plus className="h-3.5 w-3.5" />{' '}{tr('Goal for this role')}
          </button>
          {sorted.length > shown.length || open ? (
            <button onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              {open ? tr('Show less') : tr('Show all ({goalsCount})', { goalsCount: goals.length })}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function Statement({ label, text }: { label: string; text: string }) {
  const { tr } = useTranslation()
  const [full, setFull] = useState(false)
  return (
    <button onClick={() => setFull(f => !f)} className="block w-full text-left">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tr(label)}</span>
      <p className={cn('whitespace-pre-line font-serif text-sm leading-relaxed', !full && 'line-clamp-2')}>{text}</p>
    </button>
  )
}

const STATUS_DOT: Record<Goal['status'], string> = {
  done: 'bg-emerald-500', doing: 'bg-sky-500', blocked: 'bg-orange-500', to_do: 'bg-zinc-300 dark:bg-zinc-600',
}

function GoalRow({ goal }: { goal: Goal }) {
  const { tr } = useTranslation()
  const overdue = isOverdue(goal)
  const due = goal.due_date ? parseDateKey(goal.due_date).toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' }) : null
  return (
    <Link href={`/protected/goals/${goal.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[goal.status])} />
      <span className={cn('min-w-0 flex-1 truncate text-sm', goal.status === 'done' && 'text-muted-foreground line-through')}>{tr(goal.title)}</span>
      {due && <span className={cn('shrink-0 text-[11px] font-semibold', overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{due}</span>}
    </Link>
  )
}

function RoleSelect({ label, roles, onPick, compact }: { label: string; roles: Role[]; onPick: (roleId: string) => void; compact?: boolean }) {
  const { tr } = useTranslation()
  return (
    <select
      value=""
      aria-label={tr(label)}
      onChange={e => { if (e.target.value) onPick(e.target.value) }}
      className={cn('shrink-0 rounded-lg border border-border bg-background font-semibold text-violet-700 dark:text-violet-300', compact ? 'max-w-[5.5rem] px-1.5 py-1 text-[11px]' : 'px-2 py-1 text-xs')}
    >
      <option value="">{tr(label)}…</option>
      {roles.map(r => <option key={r.id} value={r.id}>{r.emoji} {tr(r.name)}</option>)}
    </select>
  )
}

// Visions from before roles, kept as they were
function LegacyVisions({ open, onToggle, goals, visions, categories, userId, onRefresh }: {
  open: boolean
  onToggle: () => void
  goals: Goal[]
  visions: Vision[]
  categories: GoalCategory[]
  userId: string
  onRefresh: () => void
}) {
  const { tr } = useTranslation()
  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-3">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block text-xs font-black uppercase">{tr('Visions{value}', { value: visions.length ? ` · ${visions.length}` : '' })}</span>
          <span className="block text-[11px] text-muted-foreground">{tr('Your visions from before roles, still here.')}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end"><VisionCreator onCreated={onRefresh} /></div>
          <VisionListView goals={goals} visions={visions} categories={categories} currentUserId={userId} onRefresh={onRefresh} />
        </div>
      )}
    </section>
  )
}
