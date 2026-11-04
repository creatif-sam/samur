'use client'

import { useMemo, useState, useRef } from 'react'
import { Goal } from '@/lib/types'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Target, Archive,
  RotateCcw, Plus, Pencil, Trash2, Search,
  Calendar, ChevronRight, Clock, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,DialogDescription } from '@/components/ui/dialog'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { VisionCreator } from './VisionCreator'
import { Vision } from '@/app/protected/goals/page'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { parseDateKey, toLocalDateKey } from '@/lib/dates'
import { PACE_LABEL, PACE_STYLE, daysLeftLabel, visionPace, visionProgress, yearElapsed } from '@/lib/visions'

export function VisionListView({
  goals, visions, categories, currentUserId, onRefresh,
}: {
  goals: Goal[], visions: Vision[], categories: GoalCategory[], currentUserId: string | null, onRefresh: () => void
}) {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived' | 'all'>('active')
  // Which target year to show: this year by default thinking, but everything is one tap away
  const [yearFilter, setYearFilter] = useState<'all' | 'this' | 'later' | 'open'>('all')
  const year = yearElapsed()
  const [editingVision, setEditingVision] = useState<Vision | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const linkedGoalCount = deletingId ? goals.filter(g => g.vision_id === deletingId).length : 0

  // Added missing state for the Detail Overlay
  const [selectedVision, setSelectedVision] = useState<any | null>(null)
  const [isAddingGoalInternal, setIsAddingGoalInternal] = useState(false)
  const [contextMenuVision, setContextMenuVision] = useState<any | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  function getLongPressHandlers(v: (typeof processedVisions)[number]) {
    return {
      onPointerDown: () => {
        longPressTriggered.current = false
        longPressTimer.current = setTimeout(() => {
          longPressTriggered.current = true
          setContextMenuVision(v)
        }, 500)
      },
      onPointerUp: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) },
      onPointerLeave: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) },
      onPointerCancel: () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClick: (e: React.MouseEvent) => {
        if (longPressTriggered.current) { e.preventDefault(); return }
        setSelectedVision(v)
      },
    }
  }

  const processedVisions = useMemo(() => {
    return visions
      .filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filterStatus === 'all' ? true : filterStatus === 'archived' ? v.is_archived : !v.is_archived
        const targetYear = v.target_date ? Number(v.target_date.slice(0, 4)) : null
        const matchesYear = yearFilter === 'all' ? true
          : yearFilter === 'open' ? targetYear === null
          : yearFilter === 'this' ? targetYear !== null && targetYear <= year.year
          : targetYear !== null && targetYear > year.year
        return matchesSearch && matchesFilter && matchesYear
      })
      .map(vision => {
        const visionGoals = goals.filter(g => g.vision_id === vision.id)
        const totalGoals = visionGoals.length
        const completedGoals = visionGoals.filter(g => g.status === 'done').length
        const avgProgress = visionProgress(visionGoals)
        const { pace, expected, daysLeft } = visionPace(avgProgress, vision.created_at, vision.target_date)
        const isOverdue = pace === 'overdue'
        // Goals in a useful order for the detail view: unfinished first, then by due date
        const orderedGoals = [...visionGoals].sort((a, b) =>
          Number(a.status === 'done') - Number(b.status === 'done') ||
          (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
        return { ...vision, totalGoals, completedGoals, avgProgress, isOverdue, pace, expected, daysLeft, goals: orderedGoals }
      })
      // Soonest target first, open-ended last
      .sort((a, b) =>
        (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999') || a.title.localeCompare(b.title))
  }, [goals, visions, searchQuery, filterStatus, yearFilter, year.year])

  // This year at a glance (active visions due this year or earlier)
  const yearSummary = useMemo(() => {
    const due = visions
      .filter(v => !v.is_archived && v.target_date && Number(v.target_date.slice(0, 4)) <= year.year)
      .map(v => {
        const progress = visionProgress(goals.filter(g => g.vision_id === v.id))
        return { progress, pace: visionPace(progress, v.created_at, v.target_date).pace }
      })
    if (due.length === 0) return null
    return {
      count: due.length,
      progress: Math.round(due.reduce((s, d) => s + d.progress, 0) / due.length),
      achieved: due.filter(d => d.pace === 'achieved').length,
      behind: due.filter(d => d.pace === 'behind' || d.pace === 'overdue').length,
    }
  }, [visions, goals, year.year])

  async function toggleArchive(id: string, currentStatus: boolean) {
    const { error } = await supabase.from('visions').update({ is_archived: !currentStatus }).eq('id', id)
    if (!error) { onRefresh(); toast.success(currentStatus ? "Restored" : "Archived"); }
  }

  async function handleDelete() {
    if (!deletingId) return
    const { error: unlinkError } = await supabase.from('goals').update({ vision_id: null }).eq('vision_id', deletingId)
    if (unlinkError) { toast.error("Couldn't delete the vision"); return }
    const { error } = await supabase.from('visions').delete().eq('id', deletingId)
    if (error) { toast.error("Couldn't delete the vision"); return }
    onRefresh(); setDeletingId(null); toast.success("Deleted")
  }

  const yearChips = [
    { value: 'all' as const, label: 'All' },
    { value: 'this' as const, label: String(year.year) },
    { value: 'later' as const, label: `${year.year + 1}+` },
    { value: 'open' as const, label: 'Open-ended' },
  ]

  return (
    <div className="space-y-6">
      {/* THIS YEAR */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Vision {year.year}
            </p>
            <p className="mt-1 text-xl font-black leading-tight">
              {yearSummary
                ? yearSummary.achieved === yearSummary.count
                  ? 'Every vision for this year achieved'
                  : yearSummary.progress >= year.pct - 10
                  ? 'You\'re keeping pace with the year'
                  : 'Time to press in'
                : 'Cast your vision for this year'}
            </p>
            <p className="mt-1 text-xs text-white/75">
              {yearSummary
                ? `${yearSummary.count} vision${yearSummary.count !== 1 ? 's' : ''} due by Dec 31 · ${yearSummary.achieved} achieved${yearSummary.behind ? ` · ${yearSummary.behind} need attention` : ''}`
                : 'Give a vision a target date this year to track it here.'}
            </p>
          </div>
          {yearSummary && (
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" className="stroke-white/20" />
                <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-white"
                  strokeDasharray={`${(yearSummary.progress / 100) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-black">{yearSummary.progress}%</span>
            </div>
          )}
        </div>
        {/* The year itself, so progress can be compared with time */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
            <span>{year.year} elapsed · {year.pct}%</span>
            <span>{year.daysLeft} days left</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white/80" style={{ width: `${year.pct}%` }} />
          </div>
        </div>
      </section>

      {/* YEAR CHIPS */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {yearChips.map(c => (
          <button
            key={c.value}
            onClick={() => setYearFilter(c.value)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition',
              yearFilter === c.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

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
            {...getLongPressHandlers(v)}
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
                      ? parseDateKey(v.target_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Open-ended'}
                  </p>
                  <h4 className="text-base font-black text-foreground leading-tight truncate">{v.title}</h4>
                  {!v.is_archived && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', PACE_STYLE[v.pace])}>{PACE_LABEL[v.pace]}</span>
                      {daysLeftLabel(v.daysLeft) && v.pace !== 'achieved' && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Clock className="h-3 w-3" /> {daysLeftLabel(v.daysLeft)}
                        </span>
                      )}
                    </div>
                  )}
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
                <div className="relative h-2 w-full bg-secondary dark:bg-zinc-800 rounded-full">
                  <div
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${v.avgProgress}%`, backgroundColor: v.is_archived ? '#94a3b8' : v.color }}
                  />
                  {v.expected !== null && v.pace !== 'achieved' && v.pace !== 'overdue' && !v.is_archived && (
                    <span
                      className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/60"
                      style={{ left: `calc(${v.expected}% - 1px)` }}
                      title={`Where you'd be on an even pace: ${v.expected}%`}
                    />
                  )}
                </div>
                {v.expected !== null && v.pace !== 'achieved' && v.pace !== 'overdue' && !v.is_archived && (
                  <p className="text-[10px] text-muted-foreground">Marker: {v.expected}% expected by today</p>
                )}
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

      {/* LONG PRESS ACTION SHEET */}
      <Dialog open={!!contextMenuVision} onOpenChange={(open) => !open && setContextMenuVision(null)}>
        <DialogContent className="w-[92vw] max-w-[340px] rounded-[28px] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Vision Actions</DialogTitle>
            <DialogDescription>Actions for {contextMenuVision?.title}</DialogDescription>
          </DialogHeader>
          {contextMenuVision && (
            <div>
              <div className="flex items-center gap-3 p-5 border-b border-border/50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${contextMenuVision.color}22` }}>
                  {contextMenuVision.emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vision</p>
                  <p className="text-sm font-black truncate">{contextMenuVision.title}</p>
                </div>
              </div>
              <div className="p-2 space-y-0.5">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors text-left"
                  onClick={() => { setEditingVision(contextMenuVision); setContextMenuVision(null) }}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors text-left"
                  onClick={() => { toggleArchive(contextMenuVision.id, contextMenuVision.is_archived); setContextMenuVision(null) }}
                >
                  {contextMenuVision.is_archived
                    ? <><RotateCcw className="w-4 h-4 text-muted-foreground" />Restore</>
                    : <><Archive className="w-4 h-4 text-muted-foreground" />Archive</>}
                </button>
                <div className="h-px bg-border/50 mx-2 my-1" />
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors text-left text-destructive"
                  onClick={() => { setDeletingId(contextMenuVision.id); setContextMenuVision(null) }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALS */}
      <VisionCreator
        hideTrigger
        initialData={editingVision}
        open={!!editingVision}
        onOpenChange={(open) => !open && setEditingVision(null)}
        onCreated={() => { onRefresh(); setEditingVision(null); }}
      />

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="w-[90vw] max-w-[350px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase italic">Delete Permanently?</DialogTitle>
            <DialogDescription>
              {linkedGoalCount > 0
                ? `${linkedGoalCount} goal${linkedGoalCount !== 1 ? 's are' : ' is'} linked to this vision. ${linkedGoalCount !== 1 ? 'They' : 'It'} will be kept as standalone goals.`
                : 'This vision has no goals.'}
              {' '}Archiving keeps it out of the way without deleting it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => setDeletingId(null)}>CANCEL</Button>
            <Button variant="destructive" className="flex-1 font-bold h-12" onClick={handleDelete}>DELETE</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit a goal from the vision detail view */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic">Edit Goal</DialogTitle>
            <DialogDescription className="sr-only">Update this goal</DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <NewGoalForm
              key={editingGoal.id}
              initialData={editingGoal}
              categories={categories}
              visions={visions}
              onCancel={() => setEditingGoal(null)}
              onCreated={() => { onRefresh(); setEditingGoal(null); setSelectedVision(null) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* --- VISION DETAIL OVERLAY --- */}
      <Dialog open={!!selectedVision} onOpenChange={(open) => !open && setSelectedVision(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
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
                      {selectedVision.target_date ? parseDateKey(selectedVision.target_date).toLocaleDateString() : 'OPEN'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{PACE_LABEL[selectedVision.pace as keyof typeof PACE_LABEL]}</span>
                  {daysLeftLabel(selectedVision.daysLeft) && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {daysLeftLabel(selectedVision.daysLeft)}
                    </span>
                  )}
                  {selectedVision.expected !== null && selectedVision.pace !== 'achieved' && selectedVision.pace !== 'overdue' && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{selectedVision.expected}% expected by today</span>
                  )}
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
                        <div key={goal.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
                          <button
                            onClick={() => {
                              if (goal.owner_id && goal.owner_id !== currentUserId) {
                                toast('This goal is shared by your partner; only they can edit it')
                                return
                              }
                              setEditingGoal(goal)
                            }}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'h-2 w-2 rounded-full shrink-0',
                                goal.status === 'done' ? 'bg-emerald-500' : goal.due_date && goal.due_date.slice(0, 10) < toLocalDateKey(new Date()) ? 'bg-rose-500' : goal.status === 'doing' ? 'bg-violet-500' : 'bg-muted-foreground/40'
                              )} />
                              <span className={cn('text-sm font-bold truncate', goal.status === 'done' && 'line-through text-muted-foreground')}>{goal.title}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${goal.status === 'done' ? 100 : goal.progress ?? 0}%`, backgroundColor: selectedVision.color }} />
                              </div>
                              <span className="text-[10px] font-black tabular-nums text-muted-foreground w-8 text-right">{goal.status === 'done' ? 100 : goal.progress ?? 0}%</span>
                            </div>
                            {goal.due_date && (
                              <p className="mt-1 text-[10px] text-muted-foreground">Due {parseDateKey(goal.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                            )}
                          </button>
                          <Link href={`/protected/goals/${goal.id}`} aria-label={`Open ${goal.title}`} className="p-2 rounded-lg text-muted-foreground hover:bg-muted">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
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