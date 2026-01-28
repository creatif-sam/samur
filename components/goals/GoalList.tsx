'use client'

import { Goal } from '@/lib/types'
import { GoalActions } from './GoalActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useState, useMemo, useEffect } from 'react'
import { Flag, Zap, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti' // Make sure to install this!

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
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: [color, '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: [color, '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  return (
    <div className="space-y-12 pb-20">
      {groupedGoals.map(({ vision, items, avgProgress }) => (
        <div key={vision.title} className="space-y-5">
          <header className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-1000 ${avgProgress === 100 ? 'scale-110 rotate-12' : ''}`}
                  style={{ backgroundColor: vision.color, boxShadow: `0 4px 14px ${vision.color}40` }}
                >
                  {avgProgress === 100 ? <Trophy className="w-5 h-5 animate-bounce" /> : <Flag className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                    {vision.emoji} {vision.title}
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Zap className={`w-3 h-3 ${avgProgress === 100 ? 'text-yellow-500' : ''}`} /> 
                    {avgProgress === 100 ? 'Vision Realized' : `${avgProgress}% Progress`}
                  </p>
                </div>
              </div>
            </div>
            
            <Progress 
                value={avgProgress} 
                className="h-2 bg-secondary" 
                style={{ '--progress-foreground': vision.color } as any}
            />
          </header>

          <div className="grid gap-3 pl-4 border-l-2 border-muted ml-5">
            {items.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdated={(updatedGoal) => {
                  onUpdated(updatedGoal);
                  // Check if this update pushed the vision to 100%
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

// GoalCard component remains similar but simplified for focus...
function GoalCard({ goal, onUpdated, onDeleted }: { goal: EnhancedGoal, onUpdated: (goal: Goal) => void, onDeleted: (id: string) => void }) {
  const supabase = createClient()
  
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
    <Card className={`border-none shadow-sm ${goal.status === 'done' ? 'bg-primary/5' : 'bg-card'}`}>
        <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
                <span className={`text-sm font-bold ${goal.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
                    {goal.title}
                </span>
                <span className="text-[9px] uppercase font-bold opacity-40">Milestone</span>
            </div>
            <Select value={goal.status} onValueChange={(v) => updateStatus(v as Goal['status'])}>
                <SelectTrigger className="w-24 h-7 text-[10px] font-black border-none bg-secondary/50">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="to_do">TO DO</SelectItem>
                    <SelectItem value="doing">DOING</SelectItem>
                    <SelectItem value="done">DONE</SelectItem>
                </SelectContent>
            </Select>
        </CardContent>
    </Card>
  )
}