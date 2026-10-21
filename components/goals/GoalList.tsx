'use client'

import { JSX, useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { Goal } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Circle,
  Ban,
  CalendarPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { NewGoalForm } from './NewGoalForm'
import ScheduleGoalDialog from './ScheduleGoalDialog'
import { dueDate, isOverdue as goalIsOverdue, sortGoals, statusForProgress } from '@/lib/goals'

const PROGRESS_STEPS = [0, 25, 50, 75, 100]

type EnhancedGoal = Goal & {
  visions?: { title: string; color: string; emoji: string } | null
  goal_categories?: { name: string; color: string; emoji: string } | null
}

interface GoalListProps {
  goals: EnhancedGoal[]
  visions: any[]
  categories: any[]
  currentUserId: string | null
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
}

export type { EnhancedGoal }

export function GoalList({
  goals,
  visions,
  categories,
  currentUserId,
  onUpdated,
  onDeleted
}: GoalListProps) {
  const [editingGoal, setEditingGoal] = useState<EnhancedGoal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<EnhancedGoal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createClient()

  const groupedGoals = useMemo(() => {
    const groups: Record<string, { key: string; vision: any; items: EnhancedGoal[]; avgProgress: number }> = {}
    goals.forEach((goal) => {
      const vId = goal.vision_id || 'unlinked'
      if (!groups[vId]) {
        groups[vId] = {
          key: vId,
          vision: goal.visions || { title: 'General Strategy', color: '#94a3b8', emoji: '🎯' },
          items: [],
          avgProgress: 0
        }
      }
      groups[vId].items.push(goal)
    })

    Object.keys(groups).forEach(key => {
      const total = groups[key].items.reduce((acc, curr) => acc + (curr.progress || 0), 0)
      groups[key].avgProgress = Math.round(total / groups[key].items.length)
      groups[key].items = sortGoals(groups[key].items)
    })

    return Object.values(groups)
  }, [goals])

  const triggerCelebration = (color: string) => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: [color, '#ffffff']
    })
  }

  async function handleConfirmDelete() {
    if (!goalToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('goals').delete().eq('id', goalToDelete.id)
      if (error) {
        toast.error("Couldn't delete the goal")
        return
      }
      onDeleted(goalToDelete.id)
      setGoalToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!goals.length) return (
    <div className="rounded-[24px] border border-dashed border-muted-foreground/30 p-12 text-center">
      <div className="text-3xl mb-3">🎯</div>
      <p className="text-sm font-semibold text-muted-foreground">No goals in this period</p>
      <p className="text-xs text-muted-foreground mt-1">Adjust the time filter or add a new goal</p>
    </div>
  )

  return (
    <div className="space-y-6 pb-24">
      {groupedGoals.map(({ key, vision, items, avgProgress }) => (
        <div key={key} className="space-y-3">
          {/* Section header — home page card style */}
          <div className="rounded-[24px] bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${vision.color}22` }}
              >
                {avgProgress === 100 ? '🏆' : (vision.emoji || '🎯')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {items.length} goal{items.length !== 1 ? 's' : ''} · {items.filter(g => g.status === 'done').length} done
                </p>
                <h2 className="text-base font-black truncate">{vision.title}</h2>
              </div>
              <span className="text-xl font-black flex-shrink-0" style={{ color: vision.color }}>
                {avgProgress}%
              </span>
            </div>
            <div className="relative h-2 w-full bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${avgProgress}%`, backgroundColor: vision.color }}
              />
            </div>
          </div>

          <div className="grid gap-3 ml-5 pl-4 border-l-2" style={{ borderColor: `${vision.color}55` }}>
            {items.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                canManage={!goal.owner_id || goal.owner_id === currentUserId}
                onUpdated={(updatedGoal) => {
                  onUpdated(updatedGoal)
                  if (updatedGoal.status === 'done') {
                    const group = groupedGoals.find(g => g.key === key)
                    if (group && group.items.every(i => i.id === updatedGoal.id ? true : i.status === 'done')) {
                      triggerCelebration(vision.color)
                    }
                  }
                }}
                onEditInitiated={() => setEditingGoal(goal)}
                onDeleteInitiated={() => setGoalToDelete(goal)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="sm:max-w-[500px] p-6 gap-6 outline-none rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight">
              Edit Goal
            </DialogTitle>
          </DialogHeader>

          {editingGoal && (
            <NewGoalForm
              key={editingGoal.id}
              initialData={editingGoal}
              visions={visions}
              categories={categories}
              onCreated={(updated) => {
                onUpdated(updated)
                setEditingGoal(null)
              }}
              onCancel={() => setEditingGoal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {/* Delete Confirmation Dialog */}
<Dialog open={!!goalToDelete} onOpenChange={(open) => !open && !isDeleting && setGoalToDelete(null)}>
  <DialogContent className="max-w-[380px] p-6 outline-none rounded-[32px] border-none shadow-2xl overflow-hidden">
    {/* CSS for the Pulsing Effect */}
    <style jsx global>{`
      @keyframes shadow-pulse {
        0% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.4); }
        70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0); }
      }
      .animate-danger-pulse {
        animation: shadow-pulse 2s infinite;
      }
    `}</style>

    <div className="flex flex-col items-center text-center space-y-4">
      <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
        <Trash2 className="w-7 h-7 text-destructive" />
      </div>

      <DialogHeader>
        <DialogTitle className="text-xl font-black uppercase italic tracking-tight">
          Confirm Delete
        </DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground leading-relaxed px-2">
        Are you sure you want to delete <span className="font-bold text-foreground">"{goalToDelete?.title}"</span>? This action is permanent.
      </p>

      <div className="flex w-full gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-muted hover:bg-secondary"
          onClick={() => setGoalToDelete(null)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          className={cn(
            "flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
            !isDeleting && "animate-danger-pulse shadow-lg shadow-destructive/20"
          )}
          onClick={handleConfirmDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  )
}

export function GoalCard({
  goal,
  canManage,
  onUpdated,
  onEditInitiated,
  onDeleteInitiated,
  defaultExpanded = false,
  linkTitle = true,
}: {
  goal: EnhancedGoal,
  canManage: boolean,
  onUpdated: (goal: Goal) => void, 
  onEditInitiated: () => void,
  onDeleteInitiated: () => void,
  defaultExpanded?: boolean,
  linkTitle?: boolean,
}) {
  const supabase = createClient()
  const [showMilestones, setShowMilestones] = useState(false)
  const [milestones, setMilestones] = useState<{ id: string; title: string; is_done: boolean; position: number }[]>([])
  const [milestonesLoaded, setMilestonesLoaded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const due = dueDate(goal)
  const formattedDate = due ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  const isOverdue = goalIsOverdue(goal)

  const loadMilestones = async () => {
    const { data } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goal.id)
      .order('position')
    setMilestones(data ?? [])
    setMilestonesLoaded(true)
  }

  const toggleMilestones = async () => {
    if (!milestonesLoaded) await loadMilestones()
    setShowMilestones(v => !v)
  }

  // The goal page opens with milestones and progress visible
  useEffect(() => {
    if (!defaultExpanded) return
    loadMilestones().then(() => setShowMilestones(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded, goal.id])

  const addMilestone = async () => {
    const title = newMilestone.trim()
    if (!title) return
    const pos = milestones.length
    const { data } = await supabase
      .from('goal_milestones')
      .insert({ goal_id: goal.id, title, position: pos })
      .select()
      .single()
    if (data) {
      const updated = [...milestones, data]
      setMilestones(updated)
      setNewMilestone('')
      setAddingMilestone(false)
      syncProgressFromMilestones(updated)
    }
  }

  const toggleMilestoneDone = async (id: string, current: boolean) => {
    await supabase.from('goal_milestones').update({ is_done: !current }).eq('id', id)
    const updated = milestones.map(m => m.id === id ? { ...m, is_done: !current } : m)
    setMilestones(updated)
    syncProgressFromMilestones(updated)
  }

  const deleteMilestone = async (id: string) => {
    await supabase.from('goal_milestones').delete().eq('id', id)
    const updated = milestones.filter(m => m.id !== id)
    setMilestones(updated)
    syncProgressFromMilestones(updated)
  }

  const syncProgressFromMilestones = async (list: typeof milestones) => {
    if (!list.length) return
    const pct = Math.round((list.filter(m => m.is_done).length / list.length) * 100)
    await saveProgress(pct, statusForProgress(pct, goal.status))
  }

  async function saveProgress(progress: number, status: Goal['status']) {
    const { data, error } = await supabase
      .from('goals')
      .update({ progress, status })
      .eq('id', goal.id)
      .select('*, visions(*), goal_categories(*)')
      .single()
    if (error || !data) {
      toast.error("Couldn't update the goal")
      return
    }
    onUpdated(data)
    if (status !== goal.status) notifyPartner(status)
  }

  // Manual progress for goals without milestones
  const setManualProgress = (progress: number) => saveProgress(progress, statusForProgress(progress, goal.status))

  // Changing the status keeps real progress: milestones decide it when there are any
  async function updateStatus(newStatus: Goal['status']) {
    let progress = goal.progress ?? 0
    if (newStatus === 'done') {
      progress = 100
    } else {
      const { data: ms } = await supabase.from('goal_milestones').select('is_done').eq('goal_id', goal.id)
      if (ms && ms.length > 0) progress = Math.round((ms.filter(m => m.is_done).length / ms.length) * 100)
      else if (newStatus === 'to_do') progress = 0
      if (progress >= 100) progress = ms && ms.length > 0 ? progress : 75 // reopening a finished goal
    }
    await saveProgress(progress, newStatus)
  }

  // Tell the other person on a shared goal when it starts or finishes
  async function notifyPartner(newStatus: Goal['status']) {
    if (newStatus !== 'done' && newStatus !== 'doing') return
    if (goal.visibility !== 'shared' || !goal.partner_id) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const target = user.id === goal.owner_id ? goal.partner_id : goal.owner_id
    if (!target || target === user.id) return

    const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    const who = profile?.name || 'Your partner'
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: target,
        type: 'goal_progress',
        title: 'Partner Goal Progress',
        body: newStatus === 'done' ? `${who} completed: ${goal.title}! 🎯` : `${who} is working on: ${goal.title}`,
        url: `/protected/goals/${goal.id}`,
      }),
    }).catch(err => console.error('Failed to send partner notification:', err))
  }

  const doneCount = milestones.filter(m => m.is_done).length

  return (
    <div className={cn(
      'rounded-[20px] bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm overflow-hidden transition-all',
      goal.status === 'done' && 'opacity-60'
    )}>
      {/* Main row */}
      <div className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1 gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
              {goal.goal_categories && (
                <span
                  className="text-[8px] font-black px-2 py-0.5 rounded-md text-white uppercase"
                  style={{ backgroundColor: goal.goal_categories.color }}
                >
                  {goal.goal_categories.emoji} {goal.goal_categories.name}
                </span>
              )}
              {formattedDate && (
                <span className={cn(
                  'text-[9px] font-bold uppercase flex items-center gap-1',
                  isOverdue ? 'text-red-500 font-black' : 'text-muted-foreground'
                )}>
                  <Calendar className="w-2.5 h-2.5" />
                  {isOverdue ? '⚠ ' : ''}{formattedDate}
                </span>
              )}
            </div>

            {linkTitle ? (
              <Link
                href={`/protected/goals/${goal.id}`}
                className={cn(
                  "text-[13px] leading-tight font-bold hover:underline",
                  goal.status === 'done' ? "text-muted-foreground/60 line-through" : "text-foreground"
                )}
              >
                {goal.title}
              </Link>
            ) : (
              <span className={cn(
                "text-[13px] leading-tight font-bold",
                goal.status === 'done' ? "text-muted-foreground/60 line-through" : "text-foreground"
              )}>
                {goal.title}
              </span>
            )}

            {(goal.progress ?? 0) > 0 && goal.status !== 'done' && (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 max-w-[140px] rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${goal.progress}%` }} />
                </div>
                <span className="text-[9px] font-bold text-muted-foreground">{goal.progress}%</span>
              </div>
            )}

            {/* Milestones toggle */}
            <button
              onClick={toggleMilestones}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              {showMilestones ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {milestonesLoaded && milestones.length > 0
                ? `${doneCount}/${milestones.length} milestones`
                : 'Milestones & progress'}
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Select value={goal.status} onValueChange={(v) => updateStatus(v as Goal['status'])}>
              <SelectTrigger className={cn(
                "w-[80px] h-8 text-[10px] font-black border-none shrink-0",
                goal.status === 'done'    && 'bg-green-500/10 text-green-600',
                goal.status === 'doing'  && 'bg-blue-500/10 text-blue-600',
                goal.status === 'blocked'&& 'bg-orange-500/10 text-orange-600',
                goal.status === 'to_do'  && 'bg-secondary'
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="to_do">TO DO</SelectItem>
                <SelectItem value="doing">DOING</SelectItem>
                <SelectItem value="blocked">BLOCKED</SelectItem>
                <SelectItem value="done">DONE</SelectItem>
              </SelectContent>
            </Select>

            {goal.status !== 'done' && (
              <button
                onClick={() => setScheduling(true)}
                aria-label="Schedule time in planner"
                className="p-1.5 hover:bg-secondary rounded-full transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {canManage && <DropdownMenu>
              <DropdownMenuTrigger className="p-1.5 hover:bg-secondary rounded-full outline-none transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={onEditInitiated} className="gap-2 text-xs font-medium cursor-pointer">
                  <Pencil className="w-3.5 h-3.5" /> Edit Goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeleteInitiated} className="gap-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
      </div>

      <ScheduleGoalDialog goal={goal} open={scheduling} onOpenChange={setScheduling} />

      {/* Milestones panel */}
      {showMilestones && (
        <div className="border-t border-border/40 px-4 py-3 space-y-2 bg-muted/30">
          {milestones.length === 0 && (
            <div className="space-y-1.5 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress</p>
              <div className="flex gap-1">
                {PROGRESS_STEPS.map(step => (
                  <button
                    key={step}
                    onClick={() => setManualProgress(step)}
                    className={cn(
                      'flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all',
                      (goal.progress ?? 0) === step ? 'bg-violet-600 text-white' : 'bg-background border border-border/60 text-muted-foreground'
                    )}
                  >
                    {step}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Or break it into milestones below and progress follows them.</p>
            </div>
          )}

          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleMilestoneDone(m.id, m.is_done)} className="shrink-0">
                {m.is_done
                  ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                  : <Circle className="w-4 h-4 text-muted-foreground" />}
              </button>
              <span className={cn(
                'flex-1 text-[12px] font-medium leading-tight',
                m.is_done && 'line-through text-muted-foreground'
              )}>
                {m.title}
              </span>
              <button
                onClick={() => deleteMilestone(m.id)}
                aria-label="Delete milestone"
                className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {addingMilestone ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={inputRef}
                autoFocus
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMilestone(); if (e.key === 'Escape') { setAddingMilestone(false); setNewMilestone('') } }}
                placeholder="Milestone title…"
                className="flex-1 text-[12px] bg-background border border-border/60 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-400"
              />
              <button onClick={addMilestone} className="text-[11px] font-bold text-violet-600 hover:text-violet-700 px-1">
                Add
              </button>
              <button onClick={() => { setAddingMilestone(false); setNewMilestone('') }} className="text-[11px] text-muted-foreground">
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAddingMilestone(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 mt-1"
            >
              <Plus className="w-3 h-3" /> Add milestone
            </button>
          )}
        </div>
      )}
    </div>
  )
}