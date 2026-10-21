'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw } from 'lucide-react'
import { formatDuration, formatMinutes, freeGaps, taskSpan, type PlannerTask } from '@/lib/planner/tasks'
import { gradientFor } from './taskColors'

const HOUR_PX = 56
const DEFAULT_START_HOUR = 5
const DEFAULT_END_HOUR = 23

interface Props {
  tasks: PlannerTask[]
  completedTaskIds: string[]
  partnerCompletedIds: string[]
  userId: string | null
  isToday: boolean
  onTaskClick: (task: PlannerTask) => void
  onToggleComplete: (taskId: string) => void
  onAddAt: (minutes: number) => void
}

type Placed = { task: PlannerTask; start: number; end: number; lane: number; lanes: number }

// Side-by-side columns for overlapping tasks: each cluster of overlaps shares its width
function layout(tasks: PlannerTask[], dayEnd: number): Placed[] {
  const items = tasks
    .map(task => {
      const span = taskSpan(task)
      return { task, start: span.start, end: Math.min(span.end, dayEnd) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const placed: Placed[] = []
  let cluster: Placed[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1

  const closeCluster = () => {
    for (const p of cluster) p.lanes = laneEnds.length
    cluster = []
    laneEnds = []
  }

  for (const item of items) {
    if (item.start >= clusterEnd) closeCluster()
    let lane = laneEnds.findIndex(end => end <= item.start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.end) } else laneEnds[lane] = item.end
    const p = { ...item, lane, lanes: 1 }
    cluster.push(p)
    placed.push(p)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  closeCluster()
  return placed
}

export default function PlannerTimeline({
  tasks,
  completedTaskIds,
  partnerCompletedIds,
  userId,
  isToday,
  onTaskClick,
  onToggleComplete,
  onAddAt,
}: Props) {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => {
      const d = new Date()
      setNowMinutes(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [isToday])

  // Show 05:00–23:00, stretched to include anything scheduled outside it
  const { startHour, endHour } = useMemo(() => {
    let s = DEFAULT_START_HOUR
    let e = DEFAULT_END_HOUR
    for (const t of tasks) {
      const span = taskSpan(t)
      s = Math.min(s, Math.floor(span.start / 60))
      e = Math.max(e, Math.min(24, Math.ceil(span.end / 60)))
    }
    return { startHour: s, endHour: e }
  }, [tasks])

  const dayStart = startHour * 60
  const dayEnd = endHour * 60
  const top = (minutes: number) => ((minutes - dayStart) / 60) * HOUR_PX
  const placed = useMemo(() => layout(tasks, dayEnd), [tasks, dayEnd])
  const gaps = useMemo(
    () => freeGaps(tasks, isToday ? Math.max(dayStart, Math.ceil(nowMinutes / 15) * 15) : dayStart, dayEnd, 30),
    [tasks, isToday, nowMinutes, dayStart, dayEnd],
  )
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  return (
    <div className="relative select-none" style={{ height: (endHour - startHour) * HOUR_PX + 8 }}>
      {/* Hour grid: tap an empty hour to add an event there */}
      {hours.map(h => (
        <div key={h} className="absolute left-0 right-0 flex" style={{ top: top(h * 60) }}>
          <span className="w-11 shrink-0 -mt-2 text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
            {formatMinutes(h * 60)}
          </span>
          {h < endHour && (
            <button
              type="button"
              aria-label={`Add event at ${formatMinutes(h * 60)}`}
              onClick={() => onAddAt(h * 60)}
              className="flex-1 border-t border-slate-200/70 dark:border-slate-700/60 hover:bg-violet-500/5 transition-colors"
              style={{ height: HOUR_PX }}
            />
          )}
          {h === endHour && <div className="flex-1 border-t border-slate-200/70 dark:border-slate-700/60" />}
        </div>
      ))}

      {/* Free gaps */}
      {gaps.map(g => (
        <button
          key={`gap-${g.start}`}
          type="button"
          onClick={() => onAddAt(g.start)}
          className="absolute left-12 right-1 rounded-2xl border-2 border-dashed border-emerald-300/70 dark:border-emerald-700/50 bg-emerald-50/40 dark:bg-emerald-900/10 flex items-start justify-between px-3 py-1.5 text-left active:scale-[0.99] transition-transform"
          style={{ top: top(g.start) + 2, height: top(g.end) - top(g.start) - 4 }}
        >
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Free · {formatDuration(g.end - g.start)}
          </span>
          <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </button>
      ))}

      {/* Tasks */}
      {placed.map(({ task, start, end, lane, lanes }) => {
        const isPartnerTask = !!task.owner_id && task.owner_id !== userId
        const isDone = isPartnerTask ? partnerCompletedIds.includes(task.id) : completedTaskIds.includes(task.id)
        const height = Math.max(top(end) - top(start) - 3, 26)
        const compact = height < 44
        return (
          <div
            key={task.id}
            onClick={() => !isPartnerTask && onTaskClick(task)}
            className={`absolute rounded-2xl px-2.5 py-1.5 bg-gradient-to-br ${gradientFor(task)} text-white shadow-sm overflow-hidden ${isDone ? 'opacity-55' : ''} ${isPartnerTask ? 'cursor-default ring-2 ring-white/50 ring-inset' : 'cursor-pointer active:scale-[0.99]'} transition-transform`}
            style={{
              top: top(start) + 1.5,
              height,
              left: `calc(3rem + (100% - 3.25rem) * ${lane / lanes})`,
              width: `calc((100% - 3.25rem) / ${lanes} - 4px)`,
            }}
          >
            <div className="flex items-start gap-1.5 h-full">
              <div className="min-w-0 flex-1">
                <p className={`text-[12px] font-black leading-tight truncate ${isDone ? 'line-through' : ''}`}>{task.text}</p>
                {!compact && (
                  <p className="text-[10px] font-semibold text-white/70 tabular-nums mt-0.5 flex items-center gap-1">
                    {task.start}–{task.end}
                    {task.recurring && <RefreshCw className="w-2.5 h-2.5" />}
                  </p>
                )}
              </div>
              {!isPartnerTask && (
                <button
                  type="button"
                  aria-label={isDone ? 'Mark not done' : 'Mark done'}
                  onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id) }}
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-white border-white' : 'border-white/60'}`}
                >
                  {isDone && <Check className="w-2.5 h-2.5 text-slate-600 stroke-[3]" />}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Now line */}
      {isToday && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
        <div className="absolute left-10 right-0 flex items-center pointer-events-none z-10" style={{ top: top(nowMinutes) - 4 }}>
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="flex-1 h-[2px] bg-rose-500" />
        </div>
      )}
    </div>
  )
}
