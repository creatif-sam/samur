'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Loader2, MoreHorizontal, Pencil, Search, Target, Trash2, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { dayLabel, formatDuration, groupByDay, hhmm, TYPE_LABEL, type CreativeLog } from '@/lib/create'

// The stored work types, each with its own colour
const TYPE_STYLE: Record<string, string> = {
  creation: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  production: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  reproduction: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}
const TYPE_BAR: Record<string, string> = {
  creation: 'bg-violet-500',
  production: 'bg-sky-500',
  reproduction: 'bg-amber-500',
}

type Filter = 'all' | 'focused' | 'aligned'

interface Props {
  logs: CreativeLog[]
  todayKey: string
  olderCount: number
  loadingMore: boolean
  onLoadMore: () => void
  onEdit: (log: CreativeLog) => void
  onDelete: (log: CreativeLog) => void
}

export default function CreateLog({ logs, todayKey, olderCount, loadingMore, onLoadMore, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [type, setType] = useState<string>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<CreativeLog | null>(null)

  const types = useMemo(() => [...new Set(logs.map(l => l.work_type).filter(Boolean))], [logs])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter(l =>
      (!q || l.worked_on.toLowerCase().includes(q) || (l.produced ?? '').toLowerCase().includes(q) || (l.notes ?? '').toLowerCase().includes(q)) &&
      (filter === 'all' || (filter === 'focused' ? l.focused : l.aligned)) &&
      (type === 'all' || l.work_type === type),
    )
  }, [logs, query, filter, type])

  const days = useMemo(() => groupByDay(shown), [shown])
  const filtering = query.trim() !== '' || filter !== 'all' || type !== 'all'
  const totalHours = shown.reduce((a, l) => a + (l.hours_worked || 0), 0)

  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  if (logs.length === 0 && olderCount === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-bold">No sessions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Start a session above and it will show up here.</p>
      </section>
    )
  }

  const chip = (active: boolean) =>
    cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <h3 className="text-base font-black tracking-tight">Your sessions</h3>
        <span className="text-[11px] font-bold text-muted-foreground">
          {shown.length} · {formatDuration(totalHours)}{filtering ? ' (filtered)' : ''}
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your sessions"
          className="h-11 w-full rounded-2xl bg-muted/60 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all', 'focused', 'aligned'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={chip(filter === f)}>
            {f === 'all' ? 'All' : f === 'focused' ? 'Focused' : 'Aligned'}
          </button>
        ))}
        {types.length > 1 && <span className="mx-0.5 w-px shrink-0 self-stretch bg-border" aria-hidden />}
        {types.length > 1 && types.map(t => (
          <button key={t} type="button" onClick={() => setType(type === t ? 'all' : t)} className={chip(type === t)}>
            {TYPE_LABEL[t] ?? t}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing matches.{' '}
          <button type="button" className="font-bold text-violet-600 dark:text-violet-400" onClick={() => { setQuery(''); setFilter('all'); setType('all') }}>Clear filters</button>
        </p>
      ) : (
        days.map(group => (
          <div key={group.day} className="space-y-2">
            <div className="flex items-center gap-3 pt-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{dayLabel(group.day, todayKey)}</p>
              <div className="h-px flex-1 bg-border/60" />
              <p className="text-[11px] font-bold text-muted-foreground">{formatDuration(group.hours)}</p>
            </div>

            {group.logs.map(log => {
              const expanded = open.has(log.id)
              const range = log.start_time && log.end_time ? `${hhmm(log.start_time)} to ${hhmm(log.end_time)}` : null
              return (
                <article key={log.id} className="flex overflow-hidden rounded-2xl border border-border/60 bg-card">
                  <div className={cn('w-1.5 shrink-0', TYPE_BAR[log.work_type] ?? 'bg-muted-foreground/40')} aria-hidden />
                  <div className="min-w-0 flex-1 p-3.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold leading-tight">{log.worked_on}</p>
                        {log.produced && <p className="mt-0.5 text-xs text-muted-foreground">Produced: {log.produced}</p>}
                      </div>
                      <span className="shrink-0 text-sm font-black tabular-nums">{formatDuration(log.hours_worked)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label="Session options" className="-mr-1.5 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(log)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleting(log)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-muted-foreground">
                      {range && <span className="font-semibold tabular-nums">{range}</span>}
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', TYPE_STYLE[log.work_type] ?? 'bg-muted text-muted-foreground')}>
                        {TYPE_LABEL[log.work_type] ?? (log.work_type || 'General')}
                      </span>
                      {log.focused && <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400"><Zap className="h-3 w-3 fill-current" /> Focused</span>}
                      {log.aligned && <span className="flex items-center gap-0.5 font-semibold text-blue-600 dark:text-blue-400"><Target className="h-3 w-3" /> On vision</span>}
                    </div>

                    {log.notes && (
                      <>
                        <p className={cn('mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80', !expanded && 'line-clamp-2')}>{log.notes}</p>
                        {log.notes.length > 90 && (
                          <button type="button" onClick={() => toggle(log.id)} className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                            {expanded ? 'Show less' : 'Read more'} <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ))
      )}

      {olderCount > 0 && (
        <Button type="button" variant="outline" onClick={onLoadMore} disabled={loadingMore} className="h-11 w-full rounded-2xl font-bold">
          {loadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</> : `Show older sessions (${olderCount})`}
        </Button>
      )}

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent className="w-[90vw] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.worked_on}” ({deleting ? formatDuration(deleting.hours_worked) : ''}) will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => { if (deleting) onDelete(deleting); setDeleting(null) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
