'use client'

import { useState } from 'react'
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
import { Plus } from 'lucide-react'

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
}

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
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState(CATEGORY_EMOJIS[0])
  const [localCategories, setLocalCategories] = useState<GoalCategory[]>(categories)

  const valid = Boolean(title.trim()) && Boolean(dueDate) && Boolean(categoryId)






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
    if (isShared) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', auth.user.id)
        .single()
      partnerId = profile?.partner_id ?? null
    }

    const goalPayload = {
      title: title.trim(),
      description: description.trim(),
      deliverable: deliverable.trim() || null,
      due_date: dueDate,
      category_id: categoryId,
      vision_id: visionId === 'none' ? null : visionId,
      goal_type: isShared ? 'combined' : 'single',
      visibility: isShared ? 'shared' : 'private',
      partner_id: partnerId,
    }

    const isEditing = Boolean(initialData?.id)

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
        .insert({ ...goalPayload, owner_id: auth.user.id })
        .select('*, visions(*), goal_categories(*)')
        .single()
      if (error) { toast.error('Failed to create goal'); return }
      toast.success('Goal created! 🎯')

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
              title: 'Shared Goal Created',
              body: `${myProfile?.name || 'Your partner'} created a new goal: ${title.trim()}`,
              url: '/protected/goals',
            }),
          }).catch(console.error)
        }

        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: auth.user.id,
            title: 'Goal Created! 🎯',
            body: `Keep focused on: ${title.trim()}`,
            url: '/protected/goals',
          }),
        }).catch(console.error)
      }

      setTitle('')
      setDescription('')
      setDeliverable('')
      setDueDate('')
      setCategoryId('')
      onCreated(data)
    }
  }

  return (
    <div className="space-y-4">
      {/* SMART hint — only on new goal */}
      {!initialData?.id && (
        <p className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 leading-relaxed">
          💡 <span className="font-bold text-foreground">SMART:</span>{' '}
          Specific · Measurable · Achievable · Relevant · Time-bound
        </p>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Title <span className="text-rose-500">*</span>
        </Label>
        <Input
          placeholder="e.g. Read 12 books this year"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {/* Vision */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Linked Vision
        </Label>
        <Select value={visionId} onValueChange={setVisionId}>
          <SelectTrigger>
            <SelectValue placeholder="No vision (standalone)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Vision (Standalone)</SelectItem>
            {visions.map(v => (
              <SelectItem key={v.id} value={v.id}>✨ {v.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Category <span className="text-rose-500">*</span>
        </Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {localCategories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.emoji ?? '📁'} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!showCategoryInput ? (
          <button
            type="button"
            onClick={() => setShowCategoryInput(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 mt-1"
          >
            <Plus className="w-3 h-3" /> Add new category
          </button>
        ) : (
          <div className="space-y-2 pt-1">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORY_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`p-1.5 border rounded-lg text-sm transition ${
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

      {/* Due Date */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Due Date <span className="text-rose-500">*</span>
        </Label>
        <Input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Description
        </Label>
        <Textarea
          placeholder="What does success look like?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Measurable Outcome */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Measurable Outcome
        </Label>
        <Input
          placeholder="e.g. 12 books read, tracked in library"
          value={deliverable}
          onChange={e => setDeliverable(e.target.value)}
        />
      </div>

      {/* Shared toggle */}
      <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Shared with partner</p>
          <p className="text-[11px] text-muted-foreground">Partner can see and contribute</p>
        </div>
        <Switch checked={isShared} onCheckedChange={setIsShared} />
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
