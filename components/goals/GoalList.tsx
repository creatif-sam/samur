'use client'

import { Goal } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'
import { Flag, Zap, Trophy, Calendar } from 'lucide-react'
import confetti from 'canvas-confetti'
import { cn } from '@/lib/utils' // <--- Add this line!

type EnhancedGoal = Goal & {
  visions?: { title: string; color: string; emoji: string } | null
  goal_categories?: { name: string; color: string; emoji: string } | null
}

export function GoalList({ goals, onUpdated, onDeleted }: { goals: EnhancedGoal[], onUpdated: (goal: Goal) => void, onDeleted: (id: string) => void }) {
  if (!goals.length) return null

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
    });
  }

  return (
    <div className="space-y-10 pb-24 px-4">
      {groupedGoals.map(({ vision, items, avgProgress }) => (
        <div key={vision.title} className="space-y-4">
          <header className="space-y-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
            <div className="flex items-center gap-3">
              <div 
                className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform ${avgProgress === 100 ? 'scale-110 rotate-3' : ''}`}
                style={{ backgroundColor: vision.color }}
              >
                {avgProgress === 100 ? <Trophy className="w-6 h-6 animate-pulse" /> : <Flag className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black uppercase tracking-tight italic truncate">
                  {vision.emoji} {vision.title}
                </h2>
                <div className="flex items-center gap-2">
                   <Zap className={`w-3 h-3 ${avgProgress === 100 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} /> 
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

          {/* Reduced side margin for mobile screens */}
          <div className="grid gap-3 pl-3 border-l-2 border-muted/50 ml-6">
            {items.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdated={(updatedGoal) => {
                  onUpdated(updatedGoal);
                  if (updatedGoal.status === 'done') {
                    const group = groupedGoals.find(g => g.vision.title === vision.title);
                    if (group && group.items.every(i => i.id === updatedGoal.id ? true : i.status === 'done')) {
                      triggerCelebration(vision.color);
                    }
                  }
                }}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GoalCard({ goal, onUpdated }: { goal: EnhancedGoal, onUpdated: (goal: Goal) => void, onDeleted: (id: string) => void }) {
  const supabase = createClient()
  
  const formattedDate = goal.due_date 
    ? new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  async function updateStatus(newStatus: Goal['status']) {
    const prog = newStatus === 'done' ? 100 : newStatus === 'doing' ? 50 : 0;
    const { data } = await supabase
      .from('goals')
      .update({ status: newStatus, progress: prog })
      .eq('id', goal.id)
      .select('*, visions(*), goal_categories(*)')
      .single()

    if (data) onUpdated(data)
  }

  return (
    <Card className={`border-none shadow-sm transition-all active:scale-[0.98] ${goal.status === 'done' ? 'bg-secondary/30' : 'bg-card'}`}>
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          {/* Tag Row */}
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

          <span className={`text-[13px] leading-tight font-bold ${goal.status === 'done' ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}>
            {goal.title}
          </span>
        </div>

        {/* Status Dropdown - Optimized for thumb tapping */}
        <Select value={goal.status} onValueChange={(v) => updateStatus(v as Goal['status'])}>
          <SelectTrigger className={cn(
            "w-[75px] h-8 text-[10px] font-black border-none shrink-0 transition-colors",
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
      </CardContent>
    </Card>
  )
}