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
  
  // Format the date to be clean (e.g., "Jan 28")
  const formattedDate = goal.due_date 
    ? new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'NO DATE';

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
      <CardContent className="p-3 flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0 flex-1">
          {/* CATEGORY & DEADLINE ROW */}
          <div className="flex items-center gap-2 mb-1">
            {goal.goal_categories && (
              <span 
                className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white uppercase italic"
                style={{ backgroundColor: goal.goal_categories.color }}
              >
                {goal.goal_categories.emoji} {goal.goal_categories.name}
              </span>
            )}
            <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              📅 {formattedDate}
            </span>
          </div>

          {/* GOAL TITLE */}
          <span className={`text-sm font-bold truncate ${goal.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
            {goal.title}
          </span>

          {/* VISION TITLE TAG */}
          <span className="text-[9px] uppercase font-black text-primary italic mt-0.5 opacity-80">
            {goal.visions?.title ? `✨ ${goal.visions.title}` : '✦ STANDALONE'}
          </span>
        </div>

        {/* STATUS SELECT */}
        <Select value={goal.status} onValueChange={(v) => updateStatus(v as Goal['status'])}>
          <SelectTrigger className="w-20 h-7 text-[9px] font-black border-none bg-secondary/50 shrink-0">
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