'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  Target,
  CheckCircle2,
  Clock,
  MoreVertical,
  Archive,
  RotateCcw,
  Plus,
  ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { Vision } from '@/app/protected/goals/page'
import { cn } from '@/lib/utils'

interface VisionWithStats extends Vision {
  description?: string
  totalGoals: number
  completedGoals: number
  avgProgress: number
  isOverdue: boolean
}

export function VisionListView({
  goals,
  visions,
  categories,
  onRefresh,
}: {
  goals: Goal[]
  visions: Vision[]
  categories: GoalCategory[]
  onRefresh: () => void
}) {
  const supabase = createClient()
  const [activeVisionForGoal, setActiveVisionForGoal] = useState<string | null>(null)

  const visionStats = useMemo(() => {
    return visions.map(vision => {
      const visionGoals = goals.filter(g => g.vision_id === vision.id)
      const totalGoals = visionGoals.length
      const completedGoals = visionGoals.filter(g => g.status === 'done').length
      const avgProgress =
        totalGoals > 0
          ? Math.round(
              visionGoals.reduce((acc, curr) => acc + (curr.progress || 0), 0) /
                totalGoals
            )
          : 0
      const isOverdue =
        vision.target_date &&
        new Date(vision.target_date) < new Date() &&
        avgProgress < 100

      return {
        ...vision,
        totalGoals,
        completedGoals,
        avgProgress,
        isOverdue,
      }
    })
  }, [goals, visions])

  async function toggleArchive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('visions')
      .update({ is_archived: !currentStatus })
      .eq('id', id)

    if (!error) onRefresh()
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
      {visionStats.map(v => (
        <Card
          key={v.id}
          className={cn(
            'relative overflow-hidden border-t-4 shadow-sm flex flex-col transition-all',
            v.is_archived
              ? 'opacity-60 grayscale-[0.5] bg-secondary/10'
              : 'opacity-100'
          )}
          style={{ borderTopColor: v.is_archived ? '#94a3b8' : v.color }}
        >
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-start justify-between">
              <div className="text-2xl sm:text-3xl">{v.emoji}</div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-bold uppercase text-[10px]">
                  <DropdownMenuItem
                    onClick={() => toggleArchive(v.id, v.is_archived)}
                  >
                    {v.is_archived ? (
                      <>
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="w-3 h-3 mr-2" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CardTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight leading-snug">
              {v.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 flex-grow">
            {v.description && (
              <div className="relative p-3 bg-muted/30 rounded border-l-2 border-primary/20 italic text-[11px] leading-relaxed">
                <ScrollText className="w-3 h-3 absolute -top-1.5 -right-1.5 text-primary/40" />
                "{v.description}"
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Realization</span>
                <span>{v.avgProgress}%</span>
              </div>
              <Progress
                value={v.avgProgress}
                className="h-1.5"
                style={{ '--progress-foreground': v.color } as any}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-y border-dashed py-3">
              <div>
                <p className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Scope
                </p>
                <p className="font-black text-xs uppercase italic">
                  {v.totalGoals} Goals
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Hits
                </p>
                <p className="font-black text-xs uppercase italic">
                  {v.completedGoals} Done
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase italic text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {v.target_date
                    ? new Date(v.target_date).toLocaleDateString()
                    : 'No End'}
                </span>
              </div>

              {!v.is_archived && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-[10px] font-black uppercase italic px-3 bg-primary/10 text-primary border border-primary/20"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Goal
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="w-[95vw] max-w-xl">
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase italic tracking-tight">
                        New Goal for: {v.title}
                      </DialogTitle>
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
