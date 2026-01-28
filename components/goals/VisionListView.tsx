'use client'

import { useMemo } from 'react'
import { Goal } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Target, CheckCircle2, Clock, MoreVertical, Archive, RotateCcw, Plus, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { Vision } from '@/app/protected/goals/page'
import { cn } from '@/lib/utils'

export function VisionListView({ 
  goals, 
  visions, 
  categories, 
  onRefresh 
}: { 
  goals: Goal[], 
  visions: Vision[], 
  categories: GoalCategory[], 
  onRefresh: () => void 
}) {
  const supabase = createClient()

  const visionStats = useMemo(() => {
    return visions.map(vision => {
      const visionGoals = goals.filter(g => g.vision_id === vision.id)
      const totalGoals = visionGoals.length
      const completedGoals = visionGoals.filter(g => g.status === 'done').length
      const avgProgress = totalGoals > 0 
        ? Math.round(visionGoals.reduce((acc, curr) => acc + (curr.progress || 0), 0) / totalGoals)
        : 0
      return { ...vision, totalGoals, completedGoals, avgProgress }
    })
  }, [goals, visions])

  async function toggleArchive(id: string, currentStatus: boolean) {
    await supabase.from('visions').update({ is_archived: !currentStatus }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visionStats.map((v) => (
        <Card 
          key={v.id} 
          className={cn(
            "relative overflow-hidden border-t-4 shadow-sm group transition-all duration-300",
            v.is_archived ? "opacity-60 grayscale-[0.5] bg-secondary/10" : "opacity-100"
          )} 
          style={{ borderTopColor: v.is_archived ? '#94a3b8' : v.color }}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="text-3xl mb-2">{v.emoji}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-bold uppercase text-[10px]">
                  <DropdownMenuItem onClick={() => toggleArchive(v.id, v.is_archived)}>
                    {v.is_archived ? <><RotateCcw className="w-3 h-3 mr-2" /> Restore</> : <><Archive className="w-3 h-3 mr-2" /> Archive</>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardTitle className="text-xl font-black uppercase tracking-tighter italic leading-tight">
              {v.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {v.description && (
              <div className="relative p-3 bg-muted/30 rounded border-l-2 border-primary/20 italic text-[11px] text-muted-foreground">
                <ScrollText className="w-3 h-3 absolute -top-1.5 -right-1.5 text-primary/40" />
                "{v.description}"
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground">
                <span>Realization</span>
                <span>{v.avgProgress}%</span>
              </div>
              <Progress value={v.avgProgress} className="h-1.5" style={{ '--progress-foreground': v.color } as any} />
            </div>

            <div className="grid grid-cols-2 gap-3 border-y border-dashed py-3">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Target className="w-3 h-3" /> Scope</p>
                <p className="font-black text-xs uppercase italic">{v.totalGoals} Goals</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Hits</p>
                <p className="font-black text-xs uppercase italic">{v.completedGoals} Done</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground uppercase italic">
                <Clock className="w-3 h-3" />
                <span>{v.target_date ? new Date(v.target_date).toLocaleDateString() : 'No End'}</span>
              </div>
              
              {!v.is_archived && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="h-7 text-[10px] font-black uppercase italic bg-primary/10 text-primary border border-primary/20">
                      <Plus className="w-3 h-3 mr-1" /> Add Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase italic tracking-tighter">New Goal: {v.title}</DialogTitle>
                    </DialogHeader>
                    <NewGoalForm 
                      categories={categories} 
                      visions={visions}
                      initialVisionId={v.id} 
                      onCancel={() => {}} 
                      onCreated={() => onRefresh()} 
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}