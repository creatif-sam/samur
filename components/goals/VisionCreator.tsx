'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChevronDown, Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { FIRST_GOAL_HORIZONS, firstGoalDue, newGoalOwnership } from '@/lib/goalGuide'
import { Vision } from '@/app/protected/goals/page'

const COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
]
const EMOJIS = ['🔭', '🚀', '🧠', '💪', '🎨', '🌍', '📈', '🧘', '✝️', '🙏', '👑', '🌱']

interface VisionCreatorProps {
  onCreated: () => void
  initialData?: Vision | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Edit-only instances don't show their own "Cast New Vision" button
  hideTrigger?: boolean
}

export function VisionCreator({ onCreated, initialData, open, onOpenChange, hideTrigger }: VisionCreatorProps) {
  const supabase = createClient()

  const [internalOpen, setInternalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  // Create only: one first goal gives the vision a path, so it is not just a wish
  const [firstGoal, setFirstGoal] = useState('')
  const [horizon, setHorizon] = useState<number>(90)
  const [showLook, setShowLook] = useState(false)
  const [newVision, setNewVision] = useState({
    title: '',
    description: '',
    color: COLORS[0],
    emoji: EMOJIS[0],
    target_date: '',
  })

  useEffect(() => {
    if (initialData) {
      setNewVision({
        title: initialData.title || '',
        description: initialData.description || '',
        color: initialData.color || COLORS[0],
        emoji: initialData.emoji || EMOJIS[0],
        target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '',
      })
    }
  }, [initialData])

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen

  async function handleSaveVision() {
    if (!newVision.title.trim()) return
    setIsCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: newVision.title.trim(),
      description: newVision.description.trim(),
      color: newVision.color,
      emoji: newVision.emoji,
      target_date: newVision.target_date || null,
      owner_id: user?.id,
    }

    let error: { message: string } | null
    let createdId: string | null = null
    if (initialData) {
      error = (await supabase.from('visions').update(payload).eq('id', initialData.id)).error
    } else {
      const res = await supabase.from('visions').insert(payload).select('id').single()
      error = res.error
      createdId = (res.data as { id: string } | null)?.id ?? null
    }

    if (error) {
      toast.error("Couldn't save the vision. Check your connection and try again.")
    } else {
      // The first goal, with the due date the user saw on the chip
      const goalTitle = firstGoal.trim()
      let goalNote: 'none' | 'ok' | 'failed' = 'none'
      if (!initialData && goalTitle && user?.id) {
        if (!createdId) {
          goalNote = 'failed'
        } else {
          const { error: goalError } = await supabase.from('goals').insert({
            title: goalTitle,
            description: '',
            deliverable: null,
            due_date: firstGoalDue(horizon, toLocalDateKey(new Date()), newVision.target_date),
            category_id: null,
            vision_id: createdId,
            ...newGoalOwnership({ ownerId: user.id }),
          })
          goalNote = goalError ? 'failed' : 'ok'
        }
      }
      if (goalNote === 'failed') toast.warning("Vision saved, but the first goal couldn't be added. Add it from the vision card.")
      else toast.success(initialData ? 'Vision updated' : goalNote === 'ok' ? 'Vision cast, with its first goal 🔭' : 'Vision cast 🔭')
      setIsOpen(false)
      if (!initialData) {
        setNewVision({ title: '', description: '', color: COLORS[0], emoji: EMOJIS[0], target_date: '' })
        setFirstGoal('')
        setHorizon(90)
        setShowLook(false)
      }
      onCreated()
    }
    setIsCreating(false)
  }

  const isEditing = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEditing && !hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-transform font-bold"
          >
            <Eye className="w-4 h-4" />
            Cast New Vision
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[95vw] max-w-[460px] p-0 overflow-hidden rounded-3xl gap-0">
        {/* Hero header */}
        <div
          className="relative px-6 pt-7 pb-6 text-white overflow-hidden"
          style={{ backgroundColor: newVision.color }}
        >
          <div className="absolute -top-6 -right-6 text-[100px] opacity-10 select-none leading-none">
            {newVision.emoji}
          </div>
          <DialogHeader className="text-left relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
              {isEditing ? 'Refine the North Star' : 'Define the North Star'}
            </p>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white leading-tight">
              {newVision.title || (isEditing ? 'Edit Vision' : 'New Vision')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing ? 'Update your vision details' : 'Create a new long-term vision'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5 max-h-[65svh] overflow-y-auto">
          {/* What a vision is: new visions only */}
          {!isEditing && (
            <div className="rounded-2xl bg-muted/60 px-3.5 py-3 text-[12px] leading-relaxed">
              <p className="font-bold text-foreground">A vision is the bigger picture your goals serve.</p>
              <p className="text-muted-foreground">Describe it as if it is already true, then give it a first goal so it has a path.</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Name your vision <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Financial Freedom"
              value={newVision.title}
              onChange={e => setNewVision({ ...newVision, title: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary font-bold h-11"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Target date <span className="font-medium normal-case tracking-normal">(optional)</span>
            </Label>
            <Input
              type="date"
              value={newVision.target_date}
              onChange={e => setNewVision({ ...newVision, target_date: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary font-bold h-11"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(() => {
                const now = new Date()
                const y = now.getFullYear()
                const inMonths = (m: number) => toLocalDateKey(new Date(y, now.getMonth() + m, now.getDate()))
                return [
                  { label: `End of ${y}`, value: `${y}-12-31` },
                  { label: '6 months', value: inMonths(6) },
                  { label: `End of ${y + 1}`, value: `${y + 1}-12-31` },
                  { label: '3 years', value: inMonths(36) },
                  { label: 'No date', value: '' },
                ]
              })().map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setNewVision({ ...newVision, target_date: p.value })}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-bold transition',
                    newVision.target_date === p.value ? 'text-white' : 'bg-muted text-muted-foreground'
                  )}
                  style={newVision.target_date === p.value ? { backgroundColor: newVision.color } : undefined}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Describe it as if it is already true
            </Label>
            <Textarea
              placeholder="I am… My days look like… This matters to me because…"
              value={newVision.description}
              onChange={e => setNewVision({ ...newVision, description: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary resize-none min-h-[104px] text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Who are you becoming, what has changed, and why does it matter?</p>
          </div>

          {/* First goal: new visions only */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                First goal toward it <span className="font-medium normal-case tracking-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Save one month of expenses"
                value={firstGoal}
                onChange={e => setFirstGoal(e.target.value)}
                className="bg-muted/50 border-0 focus-visible:ring-primary h-11"
              />
              {firstGoal.trim() ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {FIRST_GOAL_HORIZONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setHorizon(d)}
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-bold transition',
                          horizon === d ? 'text-white' : 'bg-muted text-muted-foreground',
                        )}
                        style={horizon === d ? { backgroundColor: newVision.color } : undefined}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const today = toLocalDateKey(new Date())
                    const due = firstGoalDue(horizon, today, newVision.target_date)
                    return (
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Due {parseDateKey(due).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {due !== addDays(today, horizon) ? ', the date your vision is due' : ''}
                      </p>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">A vision with no goals stays a wish. One small goal gives it a path.</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowLook(v => !v)}
            aria-expanded={showLook}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            Customize color and icon <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showLook && 'rotate-180')} />
          </button>

          {/* Color */}
          {showLook && <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Identity Color
            </Label>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewVision({ ...newVision, color: c })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all flex-shrink-0',
                    newVision.color === c
                      ? 'scale-110 ring-4 ring-offset-2 ring-current border-2 border-white'
                      : 'opacity-50 hover:opacity-80'
                  )}
                  style={{ backgroundColor: c, color: c }}
                />
              ))}
            </div>
          </div>}

          {/* Icon */}
          {showLook && <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Icon
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewVision({ ...newVision, emoji: e })}
                  className={cn(
                    'h-10 rounded-xl flex items-center justify-center text-xl transition-all',
                    newVision.emoji === e
                      ? 'text-white shadow-md scale-105'
                      : 'bg-muted opacity-50 hover:opacity-80'
                  )}
                  style={newVision.emoji === e ? { backgroundColor: newVision.color } : undefined}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>}
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={handleSaveVision}
            disabled={isCreating || !newVision.title.trim()}
            className="w-full h-13 font-black uppercase tracking-widest text-sm"
            style={{ backgroundColor: newVision.color, color: '#fff' }}
          >
            {isCreating
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : isEditing ? '👁 Update Vision' : '👁 Cast This Vision'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
