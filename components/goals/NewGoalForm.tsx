'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toLocalDateKey } from '@/lib/dates'
import { goalDatePresets, isFarAway, newGoalOwnership } from '@/lib/goalGuide'
import { loadRoles, sortRoles, type Role } from '@/lib/roles'

const CATEGORY_EMOJIS = ['🎯', '📚', '💪', '🙏', '💼', '❤️', '🧠', '🏡', '💰', '⏰']

const CATEGORY_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#4f46e5', '#15803d', '#b45309', '#7c3aed',
]

export interface GoalCategory {
  id: string
  name: string
  color: string
  emoji?: string
}

export interface Vision {
  id: string
  title: string
  is_archived?: boolean
}

const labelCls = 'text-xs font-bold uppercase tracking-wide text-muted-foreground'
const hintCls = 'text-[11px] text-muted-foreground'

export function NewGoalForm({
  onCancel,
  onCreated,
  categories,
  visions,
  initialVisionId, // 1. Add this here
  initialData, // Add this to receive the goal being edited
  roles: rolesProp,
  initialRoleId,
}: {
  onCancel: () => void
  onCreated: (goal: any) => void
  categories: GoalCategory[]
  visions: Vision[]
  initialVisionId?: string
  initialData?: any
  // Roles the goal can serve; loaded here when not given
  roles?: Role[]
  initialRoleId?: string
}) {
  const { tr } = useTranslation()

  const supabase = createClient()

  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [deliverable, setDeliverable] = useState(initialData?.deliverable || '')
  const [dueDate, setDueDate] = useState(
    initialData?.due_date ? initialData.due_date.split('T')[0] : ''
  )
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [visionId, setVisionId] = useState<string>(
    initialData?.vision_id || initialVisionId || 'none'
  )
  // The role this goal serves (Covey: every goal sits under a role)
  const [roleId, setRoleId] = useState<string>(initialData?.role_id || initialRoleId || 'none')
  const [roles, setRoles] = useState<Role[]>(rolesProp ?? [])
  // Until the roles migration runs there is no role_id column, so it isn't sent
  const [rolesReady, setRolesReady] = useState(rolesProp !== undefined)
  useEffect(() => {
    if (rolesProp !== undefined) { setRoles(rolesProp); setRolesReady(true); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const res = await loadRoles(supabase, user.id)
      if (cancelled) return
      setRoles(res.roles)
      setRolesReady(res.ready)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesProp])

  // Single toggle drives both goal_type and visibility
  const [isShared, setIsShared] = useState(
    initialData
      ? initialData.goal_type === 'combined' || initialData.visibility === 'shared'
      : false
  )
  // Create only: the first small step goes to the planner to-dos, where it can be scheduled
  const [firstStep, setFirstStep] = useState('')
  const [showMore, setShowMore] = useState(Boolean(initialData?.category_id || initialData?.vision_id || initialVisionId))
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState(CATEGORY_EMOJIS[0])
  const [localCategories, setLocalCategories] = useState<GoalCategory[]>(categories)

  const valid = Boolean(title.trim()) && Boolean(dueDate)
  const today = toLocalDateKey(new Date())

  // Only the owner may change who a goal is shared with; a partner editing a
  // shared goal must not rewrite partner_id (that would unshare it from them)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])
  const isEditing = Boolean(initialData?.id)
  const isOwner = !isEditing || !initialData?.owner_id || initialData.owner_id === currentUserId

  // Archived visions are hidden, except the one this goal is already linked to
  const visionOptions = visions.filter(v => !v.is_archived || v.id === visionId)
  // Archived roles likewise
  const roleOptions = sortRoles(roles.filter(r => !r.is_archived || r.id === roleId))
  // A partner editing your shared goal can't see your roles, so the role stays yours to set
  const canSetRole = rolesReady && isOwner






  async function createCategory() {
    if (!newCategoryName.trim()) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const color = CATEGORY_COLORS[localCategories.length % CATEGORY_COLORS.length]
    const { data, error } = await supabase
      .from('goal_categories')
      .insert({ name: newCategoryName.trim(), emoji: selectedEmoji, color, user_id: auth.user.id })
      .select()
      .single()
    if (error) { toast.error(tr('Failed to create category')); return }
    toast.success(tr('Category created'))
    setLocalCategories(c => [...c, data])
    setCategoryId(data.id)
    setNewCategoryName('')
    setSelectedEmoji(CATEGORY_EMOJIS[0])
    setShowCategoryInput(false)
  }

  async function handleSubmit() {
    if (!valid) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    let partnerId: string | null = null
    if (isShared && isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', auth.user.id)
        .single()
      partnerId = profile?.partner_id ?? null
    }

    const goalBase = {
      title: title.trim(),
      description: description.trim(),
      deliverable: deliverable.trim() || null,
      due_date: dueDate,
      category_id: categoryId || null,
      vision_id: visionId === 'none' ? null : visionId,
    }
    const goalPayload = {
      ...goalBase,
      ...(canSetRole ? { role_id: roleId === 'none' ? null : roleId } : {}),
      ...(isOwner
        ? {
            goal_type: isShared ? 'combined' : 'single',
            visibility: isShared ? 'shared' : 'private',
            partner_id: partnerId,
          }
        : {}),
    }

    if (isEditing) {
      const { data, error } = await supabase
        .from('goals')
        .update(goalPayload)
        .eq('id', initialData.id)
        .select('*, visions(*), goal_categories(*)')
        .single()
      if (error) { toast.error(tr('Failed to update goal')); return }
      toast.success(tr('Goal updated'))
      onCreated(data)
    } else {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalBase,
          ...(canSetRole && roleId !== 'none' ? { role_id: roleId } : {}),
          ...newGoalOwnership({ ownerId: auth.user.id, shared: isShared, partnerId }),
        })
        .select('*, visions(*), goal_categories(*)')
        .single()
      if (error) { toast.error(tr('Failed to create goal')); return }

      // The first step becomes a planner to-do (a milestone would count as 100% the moment it is ticked)
      const step = firstStep.trim()
      if (step) {
        const { error: stepError } = await supabase
          .from('planner_todos')
          .insert({ user_id: auth.user.id, text: step, ...(visionId !== 'none' ? { vision_id: visionId } : {}) })
        if (stepError) toast.warning(tr('Goal created, but the first step couldn\'t be added to your to-dos.'))
        else toast.success(tr('Goal created! Your first step is in your planner to-dos 🎯'))
      } else {
        toast.success(tr('Goal created! 🎯'))
      }

      if (data) {
        if (isShared && partnerId) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', auth.user.id)
            .single()
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: partnerId,
              type: 'goal_created',
              title: 'Shared Goal Created',
              body: `${myProfile?.name || 'Your partner'} created a new goal: ${title.trim()}`,
              url: `/protected/goals/${data.id}`,
            }),
          }).catch(console.error)
        }
      }

      setTitle('')
      setDescription('')
      setDeliverable('')
      setDueDate('')
      setCategoryId('')
      setFirstStep('')
      onCreated(data)
    }
  }

  return (
    <div className="space-y-4">
      {/* What a goal is, in one breath: new goals only */}
      {!initialData?.id && (
        <div className="rounded-2xl bg-violet-50 px-3.5 py-3 text-[12px] leading-relaxed dark:bg-violet-500/10">
          <p className="font-bold text-violet-900 dark:text-violet-200">{tr('A goal is one result you will finish by a date.')}</p>
          <p className="text-violet-800/80 dark:text-violet-300/80">{tr('Make it something you can count or check, and start with one small first step.')}</p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          {tr('What do you want to achieve?')}{' '}<span className="text-rose-500">*</span>
        </Label>
        <Input
          placeholder={tr('e.g. Read 12 books by December')}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <p className={hintCls}>{tr('Say what you will do, and be specific.')}</p>
      </div>

      {/* Role */}
      {canSetRole && (
        <div className="space-y-1.5">
          <Label className={labelCls}>{tr('Which role does it serve?')}</Label>
          {roleOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {roleOptions.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoleId(roleId === r.id ? 'none' : r.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-bold transition active:scale-95',
                    roleId === r.id ? 'text-white' : 'border-border bg-muted/40 text-muted-foreground',
                  )}
                  style={roleId === r.id ? { backgroundColor: r.color, borderColor: r.color } : undefined}
                >
                  {r.emoji ?? '🎯'} {tr(r.name)}
                </button>
              ))}
            </div>
          ) : (
            <p className={hintCls}>{tr('Add your roles in the Roles tab to file goals under them.')}</p>
          )}
          {roleOptions.length > 0 && roleId === 'none' && <p className={hintCls}>{tr('Pick the role this goal serves. Without one it waits under Unassigned.')}</p>}
        </div>
      )}

      {/* Measurable outcome */}
      <div className="space-y-1.5">
        <Label className={labelCls}>{tr('How will you know it\'s done?')}</Label>
        <Input
          placeholder={tr('e.g. 12 books finished')}
          value={deliverable}
          onChange={e => setDeliverable(e.target.value)}
        />
        <p className={hintCls}>{tr('A number, a date or a result you can check.')}</p>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          {tr('Due date')}{' '}<span className="text-rose-500">*</span>
        </Label>
        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {goalDatePresets(today).map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDueDate(p.value)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition active:scale-95',
                dueDate === p.value ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {tr(p.label)}
            </button>
          ))}
        </div>
        {isFarAway(dueDate, today) && (
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {tr('That is over a year away. Goals tend to work best with a date in the next few months. Consider a nearer date, or make this a vision.')}
          </p>
        )}
      </div>

      {/* First step: new goals only */}
      {!isEditing && (
        <div className="space-y-1.5">
          <Label className={labelCls}>
            {tr('What is the first step?')}{' '}<span className="font-medium normal-case tracking-normal">{tr('(optional)')}</span>
          </Label>
          <Input
            placeholder={tr('e.g. Read the first 20 pages')}
            value={firstStep}
            onChange={e => setFirstStep(e.target.value)}
          />
          <p className={hintCls}>{tr('Small enough to do this week. It goes to your planner to-dos, where you can schedule it.')}</p>
        </div>
      )}

      {/* Why */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          {tr('Why does it matter to you?')}{' '}<span className="font-medium normal-case tracking-normal">{tr('(optional)')}</span>
        </Label>
        <Textarea
          placeholder={tr('What will change when you finish?')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Shared toggle (owner only) */}
      {isOwner ? (
        <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{tr('Shared with partner')}</p>
            <p className="text-[11px] text-muted-foreground">{tr('Partner can see and contribute')}</p>
          </div>
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground rounded-2xl bg-muted/50 px-4 py-3">
          {tr('Shared goal from your partner. Only they can change who it\'s shared with.')}
        </p>
      )}

      {/* More options: category */}
      <div>
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          aria-expanded={showMore}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          {tr('More options')}{' '}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} />
        </button>
        {showMore && (
          <div className="mt-3 space-y-1.5">
            {/* Vision */}
            <div className="space-y-1.5 pb-3">
              <Label className={labelCls}>
                {tr('Linked vision')}{' '}<span className="font-medium normal-case tracking-normal">{tr('(optional)')}</span>
              </Label>
              <Select value={visionId} onValueChange={setVisionId}>
                <SelectTrigger>
                  <SelectValue placeholder={tr('No vision (standalone)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tr('No Vision (Standalone)')}</SelectItem>
                  {visionOptions.map(v => (
                    <SelectItem key={v.id} value={v.id}>✨ {tr(v.title)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {visionOptions.length > 0 && <p className={hintCls}>{tr('A linked goal moves its vision forward.')}</p>}
            </div>
            <Label className={labelCls}>
              {tr('Category')}{' '}<span className="font-medium normal-case tracking-normal">{tr('(optional)')}</span>
            </Label>
            <Select value={categoryId || 'none'} onValueChange={v => setCategoryId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={tr('General')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tr('🎯 General')}</SelectItem>
                {localCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji ?? '📁'} {tr(c.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!showCategoryInput ? (
              <button
                type="button"
                onClick={() => setShowCategoryInput(true)}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3 w-3" />{' '}{tr('Add new category')}
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                <Input
                  placeholder={tr('Category name')}
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setSelectedEmoji(e)}
                      className={`rounded-lg border p-1.5 text-sm transition ${
                        selectedEmoji === e
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                          : 'border-muted'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createCategory}>{tr('Create')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCategoryInput(false)}>{tr('Cancel')}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>{tr('Cancel')}</Button>
        <Button disabled={!valid} onClick={handleSubmit}>
          {initialData?.id ? tr('Save Changes') : tr('Create Goal')}
        </Button>
      </div>
    </div>
  )
}
