'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'

import { createClient } from '@/lib/supabase/client'
import {
  Target, MoreVertical, Archive,
  RotateCcw, Plus, Pencil, Trash2, Search,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,DialogDescription } from '@/components/ui/dialog'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { VisionCreator } from './VisionCreator'
import { Vision } from '@/app/protected/goals/page'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function VisionListView({
  goals, visions, categories, onRefresh,
}: {
  goals: Goal[], visions: Vision[], categories: GoalCategory[], onRefresh: () => void
}) {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [editingVision, setEditingVision] = useState<Vision | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Added missing state for the Detail Overlay
  const [selectedVision, setSelectedVision] = useState<any | null>(null)
  const [isAddingGoalInternal, setIsAddingGoalInternal] = useState(false)

  const processedVisions = useMemo(() => {
    return visions
      .filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filterStatus === 'all' ? true : filterStatus === 'archived' ? v.is_archived : !v.is_archived
        return matchesSearch && matchesFilter
      })
      .map(vision => {
        const visionGoals = goals.filter(g => g.vision_id === vision.id)
        const totalGoals = visionGoals.length
        const completedGoals = visionGoals.filter(g => g.status === 'done').length
        const avgProgress = totalGoals > 0 ? Math.round(visionGoals.reduce((acc, curr) => acc + (curr.progress || 0), 0) / totalGoals) : 0
        const isOverdue = vision.target_date && new Date(vision.target_date) < new Date() && avgProgress < 100
        // Ensure goals are passed into the mapped object for the Detail View
        return { ...vision, totalGoals, completedGoals, avgProgress, isOverdue, goals: visionGoals }
      })
  }, [goals, visions, searchQuery, filterStatus])

  async function toggleArchive(id: string, currentStatus: boolean) {
    const { error } = await supabase.from('visions').update({ is_archived: !currentStatus }).eq('id', id)
    if (!error) { onRefresh(); toast.success(currentStatus ? "Restored" : "Archived"); }
  }

  async function handleDelete() {
    if (!deletingId) return
    const { error } = await supabase.from('visions').delete().eq('id', deletingId)
    if (!error) { onRefresh(); setDeletingId(null); toast.success("Deleted"); }
  }

  return (
    <div className="space-y-6">
      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search visions..."
            className="pl-9 rounded-2xl bg-muted/40 border-none focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-muted/40 p-1 rounded-2xl gap-1">
          {(['active', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
                filterStatus === status
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {processedVisions.length === 0 && (
          <div className="col-span-full rounded-[24px] border border-dashed border-muted-foreground/30 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-3xl">🔭</div>
            <p className="text-sm font-semibold text-muted-foreground">No visions found</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first vision to get started</p>
          </div>
        )}
        {processedVisions.map(v => (
          <div
            key={v.id}
            onClick={() => setSelectedVision(v)}
            className={cn(
              'group cursor-pointer bg-card dark:bg-zinc-900/50 backdrop-blur-sm rounded-[24px] shadow-sm border border-border/50 overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
              v.is_archived && 'opacity-60'
            )}
          >
            {/* Thin color accent strip */}
            <div className="h-1 w-full" style={{ backgroundColor: v.is_archived ? '#94a3b8' : v.color }} />

            <div className="p-5 space-y-4">
              {/* Header: emoji icon + title + menu */}
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${v.is_archived ? '#94a3b8' : v.color}22` }}
                >
                  {v.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {v.target_date
                      ? new Date(v.target_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                      : 'Open-ended'}
                  </p>
                  <h4 className="text-base font-black text-foreground leading-tight truncate">{v.title}</h4>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-xl hover:bg-muted transition"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingVision(v)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleArchive(v.id, v.is_archived)}>
                        {v.is_archived ? <><RotateCcw className="w-3.5 h-3.5 mr-2" /> Restore</> : <><Archive className="w-3.5 h-3.5 mr-2" /> Archive</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(v.id)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description */}
              {v.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>
              )}

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progress</p>
                  <p className="text-xs font-black" style={{ color: v.is_archived ? '#94a3b8' : v.color }}>{v.avgProgress}%</p>
                </div>
                <div className="relative h-2 w-full bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${v.avgProgress}%`, backgroundColor: v.is_archived ? '#94a3b8' : v.color }}
                  />
                </div>
              </div>

              {/* Stats + Add Goal */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Goals</p>
                    <p className="text-xl font-black text-foreground">{v.totalGoals}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Done</p>
                    <p className="text-xl font-black" style={{ color: v.is_archived ? '#94a3b8' : v.color }}>{v.completedGoals}</p>
                  </div>
                </div>
                {!v.is_archived && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition active:scale-95"
                          style={{ backgroundColor: v.color }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Goal
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-xl">
                        <DialogHeader>
                          <DialogTitle className="font-black">New Goal for {v.title}</DialogTitle>
                          <DialogDescription className="sr-only">Add a goal to this vision</DialogDescription>
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
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODALS */}
      <VisionCreator 
        initialData={editingVision} 
        open={!!editingVision} 
        onOpenChange={(open) => !open && setEditingVision(null)} 
        onCreated={() => { onRefresh(); setEditingVision(null); }} 
      />

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="w-[90vw] max-w-[350px] rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-black uppercase italic">Delete Permanently?</DialogTitle></DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => setDeletingId(null)}>CANCEL</Button>
            <Button variant="destructive" className="flex-1 font-bold h-12" onClick={handleDelete}>DELETE</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- VISION DETAIL OVERLAY --- */}
      <Dialog open={!!selectedVision} onOpenChange={(open) => !open && setSelectedVision(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          {selectedVision && (
            <div className="flex flex-col">
              {/* Header Hero Section */}
              <div className="p-8 text-white relative" style={{ backgroundColor: selectedVision.color }}>
                <div className="absolute top-6 right-6 text-7xl opacity-20">{selectedVision.emoji}</div>
                <DialogHeader className="text-left">
  <div className="flex items-center gap-2 mb-2 opacity-80 text-[10px] font-bold uppercase tracking-widest">
    <Calendar className="w-3 h-3" /> Established: {new Date(selectedVision.created_at).toLocaleDateString()}
  </div>
  
  <DialogTitle className="text-4xl font-black uppercase italic leading-none tracking-tighter mb-6 text-white">
    {selectedVision.title}
  </DialogTitle>

  {/* sr-only keeps this hidden from sight but satisfies the accessibility error */}
  <DialogDescription className="sr-only">
    Viewing details and goals for {selectedVision.title}
  </DialogDescription>
</DialogHeader>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-70">Realization</p>
                    <p className="text-2xl font-black italic">{selectedVision.avgProgress}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-70">Target Date</p>
                    <p className="text-2xl font-black italic">
                      {selectedVision.target_date ? new Date(selectedVision.target_date).toLocaleDateString() : 'OPEN'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8 space-y-8 bg-background">
                {selectedVision.description && (
                  <div className="p-4 bg-muted/30 rounded-xl border-l-4 border-primary/20 italic text-sm text-muted-foreground">
                    "{selectedVision.description}"
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b-2 border-dashed pb-2">
                    <h3 className="text-xs font-black uppercase italic flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Strategy Nodes
                    </h3>
                    
                    {/* Internal Add Goal Trigger */}
                    <Dialog open={isAddingGoalInternal} onOpenChange={setIsAddingGoalInternal}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-8 font-black uppercase italic text-[10px] gap-1">
                          <Plus className="w-3 h-3" /> New Goal
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader>
                          <DialogTitle className="uppercase font-black italic">Add Goal to {selectedVision.title}</DialogTitle>
                        </DialogHeader>
                        <NewGoalForm 
                          categories={categories} 
                          visions={visions} 
                          initialVisionId={selectedVision.id} 
                          onCancel={() => setIsAddingGoalInternal(false)} 
                          onCreated={() => { onRefresh(); setIsAddingGoalInternal(false); setSelectedVision(null); }} 
                        />
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2">
                    {selectedVision.goals?.length > 0 ? (
                      selectedVision.goals.map((goal: any) => (
                        <div key={goal.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-secondary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full", 
                              goal.status === 'done' ? 'bg-green-500' : 'bg-orange-500'
                            )} />
                            <span className="text-xs font-bold uppercase italic">{goal.title}</span>
                          </div>
                          <span className="text-[10px] font-black opacity-40">{goal.progress}%</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 border border-dashed rounded-2xl opacity-40 text-[10px] font-bold uppercase italic">
                        No active goals in this vision.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}