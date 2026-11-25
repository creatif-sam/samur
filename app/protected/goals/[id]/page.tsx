'use client'

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Flag, Loader2, Lock, Target, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { daysBetween, toLocalDateKey } from '@/lib/dates'
import { dueDate, isOverdue } from '@/lib/goals'
import { GoalCard, type EnhancedGoal } from '@/components/goals/GoalList'
import { NewGoalForm, type GoalCategory } from '@/components/goals/NewGoalForm'
import type { Role } from '@/lib/roles'
import type { Vision } from '@/app/protected/goals/page'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  to_do: { label: 'To do', className: 'bg-secondary text-foreground' },
  doing: { label: 'In progress', className: 'bg-blue-500/10 text-blue-600' },
  blocked: { label: 'Blocked', className: 'bg-orange-500/10 text-orange-600' },
  done: { label: 'Done', className: 'bg-green-500/10 text-green-600' },
}

export default function GoalDetailPage() {
  const { tr } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [goal, setGoal] = useState<EnhancedGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<GoalCategory[]>([])
  const [visions, setVisions] = useState<Vision[]>([])
  // The role this goal serves, when it is one of your roles
  const [role, setRole] = useState<Pick<Role, 'name' | 'emoji' | 'color' | 'mission'> | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('goals')
      .select('*, visions(*), goal_categories(*)')
      .eq('id', id)
      .maybeSingle()
    setGoal((data as EnhancedGoal | null) ?? null)
    setLoading(false)
    if (!data) return

    const people = [data.owner_id, data.partner_id].filter(Boolean) as string[]
    const [{ data: profiles }, { data: cats }, { data: vis }] = await Promise.all([
      supabase.from('profiles').select('id, name').in('id', people),
      supabase.from('goal_categories').select('*').eq('user_id', user.id),
      supabase.from('visions').select('*').eq('owner_id', user.id),
    ])
    setNames(Object.fromEntries((profiles ?? []).map(p => [p.id, p.name || 'Partner'])))
    setCategories((cats ?? []).map(c => ({ id: c.id, name: c.name, color: c.color, emoji: c.emoji ?? undefined })))
    setVisions((vis ?? []) as Vision[])
    // Read on its own: before the roles migration (or for a partner's goal) there is none to show
    const roleId = (data as { role_id?: string | null }).role_id
    if (roleId) {
      const { data: r } = await supabase.from('roles').select('name, emoji, color, mission').eq('id', roleId).maybeSingle()
      setRole(r ?? null)
    } else {
      setRole(null)
    }
  }

  async function deleteGoal() {
    if (!goal) return
    setDeleting(true)
    const { error } = await supabase.from('goals').delete().eq('id', goal.id)
    setDeleting(false)
    if (error) { toast.error(tr('Couldn\'t delete the goal')); return }
    toast.success(tr('Goal deleted'))
    router.replace('/protected/goals')
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
  }

  if (!goal) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <Target className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="font-bold">{tr('Goal not found')}</p>
        <p className="text-sm text-muted-foreground">{tr('It may have been deleted, or it isn\'t shared with you.')}</p>
        <Link href="/protected/goals" className="inline-block rounded-2xl bg-violet-600 text-white px-4 py-2 text-sm font-bold">{tr('Back to goals')}</Link>
      </div>
    )
  }

  const isOwner = !goal.owner_id || goal.owner_id === userId
  const due = dueDate(goal)
  const today = toLocalDateKey(new Date())
  const daysLeft = goal.due_date ? daysBetween(today, goal.due_date.slice(0, 10)) : null
  const overdue = isOverdue(goal)
  const status = STATUS_LABEL[goal.status] ?? STATUS_LABEL.to_do
  const vision = goal.visions
  const sharedWith = goal.visibility === 'shared'
    ? (isOwner ? (goal.partner_id ? names[goal.partner_id] : null) : names[goal.owner_id])
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28">
      <div className="sticky top-[60px] z-20 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border/40 flex items-center gap-3">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/protected/goals'))} aria-label={tr('Back')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold truncate flex-1">{tr('Goal')}</p>
        {isOwner && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>{tr('Edit')}</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>{tr('Delete')}</Button>
          </div>
        )}
      </div>

      {/* Overview */}
      <div className="pt-5 space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${status.className}`}>{tr(status.label)}</span>
            {goal.goal_categories && (
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: goal.goal_categories.color }}>
                {goal.goal_categories.emoji} {tr(goal.goal_categories.name)}
              </span>
            )}
          </div>
          <h1 className={`text-2xl font-black leading-tight ${goal.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{tr(goal.title)}</h1>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">{tr('Progress')}</span>
            <span>{goal.progress ?? 0}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${goal.progress ?? 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" />{' '}{tr('Due')}</p>
            <p className="text-sm font-bold mt-0.5">{due ? due.toLocaleDateString(appLocale(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : tr('No due date')}</p>
            {daysLeft !== null && goal.status !== 'done' && (
              <p className={`text-[11px] font-semibold ${overdue ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {overdue ? tr('{abs} {abs:day|days} overdue', { abs: Math.abs(daysLeft) }) : daysLeft === 0 ? tr('Due today') : tr('{daysLeft} {daysLeft:day|days} left', { daysLeft: daysLeft })}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-card border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              {sharedWith ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {sharedWith ? tr('Shared') : tr('Private')}
            </p>
            <p className="text-sm font-bold mt-0.5 truncate">{sharedWith ? (isOwner ? tr('With {sharedWith}', { sharedWith: sharedWith }) : tr('From {sharedWith}', { sharedWith: sharedWith })) : tr('Only you')}</p>
          </div>
        </div>

        {role && (
          <Link href="/protected/goals" className="flex items-center gap-3 rounded-2xl border border-border p-3" style={{ backgroundColor: `${role.color}14` }}>
            <span className="text-xl">{role.emoji || '🎯'}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tr('Role')}</p>
              <p className="text-sm font-bold truncate">{tr(role.name)}</p>
              {role.mission && <p className="mt-0.5 line-clamp-2 font-serif text-xs text-muted-foreground">{role.mission}</p>}
            </div>
          </Link>
        )}

        {vision && (
          <Link href="/protected/goals" className="flex items-center gap-3 rounded-2xl border border-border p-3" style={{ backgroundColor: `${vision.color}14` }}>
            <span className="text-xl">{vision.emoji || '🎯'}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Flag className="w-3 h-3" />{' '}{tr('Vision')}</p>
              <p className="text-sm font-bold truncate">{tr(vision.title)}</p>
            </div>
          </Link>
        )}

        {(goal.description || goal.deliverable) && (
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            {goal.description && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{tr('About this goal')}</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{tr(goal.description)}</p>
              </div>
            )}
            {goal.deliverable && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{tr('How you will know it is done')}</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{goal.deliverable}</p>
              </div>
            )}
          </div>
        )}

        {/* Status, milestones and scheduling (same controls as the goals list) */}
        <div className="space-y-2">
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tr('Track it')}</p>
            <HelpTip topic="goals.track" align="left" className="-my-1" />
          </div>
          <GoalCard
            goal={goal}
            canManage={isOwner}
            linkTitle={false}
            defaultExpanded
            onUpdated={updated => setGoal(prev => (prev ? { ...prev, ...updated } : prev))}
            onEditInitiated={() => setEditing(true)}
            onDeleteInitiated={() => setConfirmDelete(true)}
          />
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {tr('Created {value}', { value: new Date(goal.created_at).toLocaleDateString(appLocale(), { dateStyle: 'medium' }) })}
        </p>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic">{tr('Edit Goal')}</DialogTitle>
            <DialogDescription className="sr-only">{tr('Update this goal')}</DialogDescription>
          </DialogHeader>
          {editing && (
            <NewGoalForm
              initialData={goal}
              categories={categories}
              visions={visions}
              onCancel={() => setEditing(false)}
              onCreated={updated => { setGoal(updated); setEditing(false) }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={open => !deleting && setConfirmDelete(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr('Delete this goal?')}</DialogTitle>
            <DialogDescription>{tr('“{title}” and its milestones will be deleted. This can\'t be undone.', { title: goal.title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>{tr('Cancel')}</Button>
            <Button variant="destructive" onClick={deleteGoal} disabled={deleting}>{deleting ? tr('Deleting…') : tr('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
