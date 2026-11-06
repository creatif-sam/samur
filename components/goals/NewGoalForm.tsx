'use client'

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
}: {
  onCancel: () => void
  onCreated: (goal: any) => void
  categories: GoalCategory[]
  visions: Vision[]
  initialVisionId?: string
  initialData?: any 
}) {

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
  // Single toggle drives both goal_type and visibility
  const [isShared, setIsShared] = useState(
    initialData
      ? initialData.goal_type === 'combined' || initialData.visibility === 'shared'
      : false
  )
  // Create only: the first small step goes to the planner to-dos, where it can be scheduled
  const [firstStep, setFirstStep] = useState('')
  const [showMore, setShowMore] = useState(Boolean(initialData?.category_id))
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
    if (error) { toast.error('Failed to create category'); return }
    toast.success('Category created')
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
      if (error) { toast.error('Failed to update goal'); return }
      toast.success('Goal updated')
      onCreated(data)
    } else {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goalBase, ...newGoalOwnership({ ownerId: auth.user.id, shared: isShared, partnerId }) })
        .select('*, visions(*), goal_categories(*)')
        .single()
      if (error) { toast.error('Failed to create goal'); return }

      // The first step becomes a planner to-do (a milestone would count as 100% the moment it is ticked)
      const step = firstStep.trim()
      if (step) {
        const { error: stepError } = await supabase
          .from('planner_todos')
          .insert({ user_id: auth.user.id, text: step, ...(visionId !== 'none' ? { vision_id: visionId } : {}) })
        if (stepError) toast.warning("Goal created, but the first step couldn't be added to your to-dos.")
        else toast.success('Goal created! Your first step is in your planner to-dos 🎯')
      } else {
        toast.success('Goal created! 🎯')
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
          <p className="font-bold text-violet-900 dark:text-violet-200">A goal is one result you will finish by a date.</p>
          <p className="text-violet-800/80 dark:text-violet-300/80">Make it something you can count or check, and start with one small first step.</p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          What do you want to achieve? <span className="text-rose-500">*</span>
        </Label>
        <Input
          placeholder="e.g. Read 12 books by December"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <p className={hintCls}>Say what you will do, and be specific.</p>
      </div>

      {/* Measurable outcome */}
      <div className="space-y-1.5">
        <Label className={labelCls}>How will you know it&apos;s done?</Label>
        <Input
          placeholder="e.g. 12 books finished"
          value={deliverable}
          onChange={e => setDeliverable(e.target.value)}
        />
        <p className={hintCls}>A number, a date or a result you can check.</p>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          Due date <span className="text-rose-500">*</span>
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
              {p.label}
            </button>
          ))}
        </div>
        {isFarAway(dueDate, today) && (
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            That is over a year away. Goals tend to work best with a date in the next few months. Consider a nearer date, or make this a vision.
          </p>
        )}
      </div>

      {/* First step: new goals only */}
      {!isEditing && (
        <div className="space-y-1.5">
          <Label className={labelCls}>
            What is the first step? <span className="font-medium normal-case tracking-normal">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Read the first 20 pages"
            value={firstStep}
            onChange={e => setFirstStep(e.target.value)}
          />
          <p className={hintCls}>Small enough to do this week. It goes to your planner to-dos, where you can schedule it.</p>
        </div>
      )}

      {/* Why */}
      <div className="space-y-1.5">
        <Label className={labelCls}>
          Why does it matter to you? <span className="font-medium normal-case tracking-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="What will change when you finish?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Vision */}
      <div className="space-y-1.5">
        <Label className={labelCls}>Linked vision</Label>
        <Select value={visionId} onValueChange={setVisionId}>
          <SelectTrigger>
            <SelectValue placeholder="No vision (standalone)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Vision (Standalone)</SelectItem>
            {visionOptions.map(v => (
              <SelectItem key={v.id} value={v.id}>✨ {v.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {visionOptions.length > 0 && <p className={hintCls}>A linked goal moves its vision forward.</p>}
      </div>

      {/* Shared toggle (owner only) */}
      {isOwner ? (
        <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Shared with partner</p>
            <p className="text-[11px] text-muted-foreground">Partner can see and contribute</p>
          </div>
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground rounded-2xl bg-muted/50 px-4 py-3">
          Shared goal from your partner. Only they can change who it&apos;s shared with.
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
          More options <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} />
        </button>
        {showMore && (
          <div className="mt-3 space-y-1.5">
            <Label className={labelCls}>
              Category <span className="font-medium normal-case tracking-normal">(optional)</span>
            </Label>
            <Select value={categoryId || 'none'} onValueChange={v => setCategoryId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">🎯 General</SelectItem>
                {localCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji ?? '📁'} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!showCategoryInput ? (
              <button
                type="button"
                onClick={() => setShowCategoryInput(true)}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3 w-3" /> Add new category
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                <Input
                  placeholder="Category name"
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
                  <Button size="sm" onClick={createCategory}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCategoryInput(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={!valid} onClick={handleSubmit}>
          {initialData?.id ? 'Save Changes' : 'Create Goal'}
        </Button>
      </div>
    </div>
  )
}
