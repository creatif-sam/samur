'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  Target, CheckCircle2, Clock, MoreVertical, Archive,
  RotateCcw, Plus, ScrollText, Pencil, Trash2, Search,
  Calendar, ChevronRight // Added missing icons
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
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-2xl border border-dashed">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search visions..." 
            className="pl-9 bg-background" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="flex gap-2">
          {['active', 'archived'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              className="font-bold uppercase text-[10px] tracking-widest"
              onClick={() => setFilterStatus(status as any)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {processedVisions.map(v => (
          <Card 
            key={v.id} 
            onClick={() => setSelectedVision(v)} // Trigger detail view
            className={cn('relative overflow-hidden border-t-4 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all', v.is_archived && 'opacity-60 grayscale-[0.5]')} 
            style={{ borderTopColor: v.is_archived ? '#94a3b8' : v.color }}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="text-3xl">{v.emoji}</div>
                <div onClick={(e) => e.stopPropagation()}> {/* Stop detail view from opening when clicking menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="font-bold uppercase text-[10px]">
                      <DropdownMenuItem onClick={() => setEditingVision(v)}><Pencil className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleArchive(v.id, v.is_archived)}>
                        {v.is_archived ? <><RotateCcw className="w-3 h-3 mr-2" /> Restore</> : <><Archive className="w-3 h-3 mr-2" /> Archive</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(v.id)}><Trash2 className="w-3 h-3 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardTitle className="text-xl font-black uppercase italic tracking-tight">{v.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              {v.description && <div className="p-3 bg-muted/30 rounded border-l-2 italic text-[11px]">"{v.description}"</div>}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground"><span>Realization</span><span>{v.avgProgress}%</span></div>
                <Progress value={v.avgProgress} className="h-1.5" style={{ '--progress-foreground': v.color } as any} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-dashed py-3">
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase flex gap-1"><Target className="w-3 h-3" /> Scope</p><p className="font-black text-xs italic">{v.totalGoals} Goals</p></div>
                <div><p className="text-[9px] font-bold text-muted-foreground uppercase flex gap-1"><CheckCircle2 className="w-3 h-3" /> Hits</p><p className="font-black text-xs italic">{v.completedGoals} Done</p></div>
              </div>
              <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase italic text-muted-foreground">
                  <Clock className="w-3 h-3" /> {v.target_date ? new Date(v.target_date).toLocaleDateString() : 'No End'}
                </div>
                {!v.is_archived && (
                  <div onClick={(e) => e.stopPropagation()}> {/* Stop detail view from opening when clicking add goal */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="h-7 text-[10px] font-black uppercase italic bg-primary/10 text-primary border border-primary/20"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Goal
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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