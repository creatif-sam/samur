'use client'

import { JSX, useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from '@/lib/supabase/client'
import { 
  Flag, 
  Zap, 
  Trophy, 
  Calendar, 
  MoreVertical, 
  Pencil, 
  Trash2 
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { cn } from '@/lib/utils'
import { NewGoalForm } from './NewGoalForm'

type EnhancedGoal = Goal & {
  visions?: { title: string; color: string; emoji: string } | null
  goal_categories?: { name: string; color: string; emoji: string } | null
}

interface GoalListProps {
  goals: EnhancedGoal[]
  visions: any[]      // Added missing definition
  categories: any[]   // Added missing definition
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
}

export function GoalList({ 
  goals, 
  visions,    // Added missing prop
  categories, // Added missing prop
  onUpdated, 
  onDeleted 
}: GoalListProps) {
  const [editingGoal, setEditingGoal] = useState<EnhancedGoal | null>(null)

  const groupedGoals = useMemo(() => {
    const groups: Record<string, { vision: any; items: EnhancedGoal[]; avgProgress: number }> = {}
    goals.forEach((goal) => {
      const vId = goal.vision_id || 'unlinked'
      if (!groups[vId]) {
        groups[vId] = {
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

  if (!goals.length) return null

  return (
    <div className="space-y-10 pb-24 px-4">
      {groupedGoals.map(({ vision, items, avgProgress }) => (
        <div key={vision.title} className="space-y-4">
          <header className="space-y-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform",
                  avgProgress === 100 && "scale-110 rotate-3"
                )}
                style={{ backgroundColor: vision.color }}
              >
                {avgProgress === 100 ? <Trophy className="w-6 h-6 animate-pulse" /> : <Flag className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black uppercase tracking-tight italic truncate">
                  {vision.emoji} {vision.title}
                </h2>
                <div className="flex items-center gap-2">
                   <Zap className={cn("w-3 h-3", avgProgress === 100 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} /> 
                   <span className="text-[10px] font-bold uppercase text-muted-foreground">
                     {avgProgress === 100 ? 'Vision Realized' : `${avgProgress}% Progress`}
                   </span>
                </div>
              </div>
            </div>
            <Progress 
                value={avgProgress} 
                className="h-1.5 bg-secondary" 
                style={{ '--progress-foreground': vision.color } as any}
            />
          </header>

          <div className="grid gap-3 pl-3 border-l-2 border-muted/50 ml-6">
            {items.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdated={(updatedGoal) => {
                  onUpdated(updatedGoal)
                  if (updatedGoal.status === 'done') {
                    const group = groupedGoals.find(g => g.vision.title === vision.title)
                    if (group && group.items.every(i => i.id === updatedGoal.id ? true : i.status === 'done')) {
                      triggerCelebration(vision.color)
                    }
                  }
                }}
                onDeleted={onDeleted}
                onEditInitiated={() => setEditingGoal(goal)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Edit Goal Drawer */}
   


<Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
  <DialogContent className="sm:max-w-[500px] p-6 gap-6 outline-none">
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
    </div>
  )
}

function GoalCard({ 
  goal, 
  onUpdated, 
  onDeleted, 
  onEditInitiated 
}: { 
  goal: EnhancedGoal, 
  onUpdated: (goal: Goal) => void, 
  onDeleted: (id: string) => void,
  onEditInitiated: () => void
}) {
  const supabase = createClient()
  
  const formattedDate = goal.due_date 
    ? new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  async function updateStatus(newStatus: Goal['status']) {
    const prog = newStatus === 'done' ? 100 : newStatus === 'doing' ? 50 : 0
    const { data } = await supabase
      .from('goals')
      .update({ status: newStatus, progress: prog })
      .eq('id', goal.id)
      .select('*, visions(*), goal_categories(*)')
      .single()

    if (data) onUpdated(data)
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this goal?')) return
    const { error } = await supabase.from('goals').delete().eq('id', goal.id)
    if (!error) onDeleted(goal.id)
  }

  return (
    <Card className={cn(
      "border-none shadow-sm transition-all active:scale-[0.98]",
      goal.status === 'done' ? "bg-secondary/30" : "bg-card"
    )}>
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1 gap-1">
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
              <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> {formattedDate}
              </span>
            )}
          </div>

          <span className={cn(
            "text-[13px] leading-tight font-bold",
            goal.status === 'done' ? "text-muted-foreground/60 line-through" : "text-foreground"
          )}>
            {goal.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Select value={goal.status} onValueChange={(v) => updateStatus(v as Goal['status'])}>
            <SelectTrigger className={cn(
              "w-[75px] h-8 text-[10px] font-black border-none shrink-0",
              goal.status === 'done' ? "bg-green-500/10 text-green-600" : "bg-secondary"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="to_do">TO DO</SelectItem>
              <SelectItem value="doing">DOING</SelectItem>
              <SelectItem value="done">DONE</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 hover:bg-secondary rounded-full outline-none transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={onEditInitiated} className="gap-2 text-xs font-medium cursor-pointer">
                <Pencil className="w-3.5 h-3.5" /> Edit Goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="gap-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}