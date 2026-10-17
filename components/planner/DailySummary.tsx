'use client'

import { PlannerTask } from './DailyPlanner'
import { ListChecks, Clock, Trophy, CheckCircle2, Lightbulb } from 'lucide-react'
import { busyMinutes as countBusyMinutes, taskDuration } from '@/lib/planner/tasks'

const HOURS_START = 5
const HOURS_END = 23

interface DaySummaryProps {
  tasks: PlannerTask[]
  completedTaskIds: string[]
  visions?: Record<string, { title: string; emoji: string }>
}

export default function DaySummary({ tasks, completedTaskIds, visions }: DaySummaryProps) {
  const totalDayMinutes = (HOURS_END - HOURS_START) * 60

  const taskDurations = tasks.map((task) => ({
    ...task,
    duration: taskDuration(task),
  }))

  // Overlapping events count once; only the 05:00–23:00 window counts as plannable
  const busyMinutes = countBusyMinutes(tasks, HOURS_START * 60, HOURS_END * 60)
  const freeMinutes = Math.max(totalDayMinutes - busyMinutes, 0)
  const freeHours = (freeMinutes / 60).toFixed(1)

  const completedCount = tasks.filter(t => completedTaskIds.includes(t.id)).length
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  const longestTask = taskDurations.length > 0
      ? taskDurations.reduce((a, b) => b.duration > a.duration ? b : a)
      : null

  // SMART SUGGESTION LOGIC
  const getSuggestion = () => {
    if (freeMinutes <= 30) return "Schedule is tight. Focus on current tasks."
    if (visions) {
      const visionIds = Object.keys(visions)
      const usedVisionIds = tasks.map(t => t.vision_id).filter(Boolean)
      const unusedVision = visionIds.find(id => !usedVisionIds.includes(id as string))
      if (unusedVision) {
        return `You have ${freeHours}h free. Why not spend 30m on "${visions[unusedVision].emoji} ${visions[unusedVision].title}"?`
      }
    }
    return `Great window of ${freeHours}h found. Use it for deep reflection.`
  }

  return (
    <div className="space-y-5 overflow-hidden w-full">
      {/* Metrics Row - Optimized Grid for Phone */}
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="flex flex-col items-center sm:flex-row sm:gap-3">
          <CheckCircle2 className="text-blue-500 opacity-80 mb-1 sm:mb-0" size={18} />
          <div className="text-center sm:text-left">
            <div className="text-sm sm:text-lg font-bold tracking-tight">{completionRate}%</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-widest">Done</div>
          </div>
        </div>

        <div className="flex flex-col items-center sm:flex-row sm:gap-3 border-x border-slate-100 dark:border-slate-800">
          <ListChecks className="text-slate-400 opacity-70 mb-1 sm:mb-0" size={18} />
          <div className="text-center sm:text-left">
            <div className="text-sm sm:text-lg font-bold tracking-tight">{tasks.length}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-widest">Events</div>
          </div>
        </div>

        <div className="flex flex-col items-center sm:flex-row sm:gap-3">
          <Clock className="text-slate-400 opacity-70 mb-1 sm:mb-0" size={18} />
          <div className="text-center sm:text-left">
            <div className="text-sm sm:text-lg font-bold tracking-tight">{freeHours}h</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-widest">Free</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-out"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Smart Suggestion - Fixed Leading */}
      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-2xl p-3 flex items-start gap-3">
        <Lightbulb className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-blue-600/60 uppercase tracking-widest mb-0.5">Suggestion</p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
            {getSuggestion()}
          </p>
        </div>
      </div>

      {/* Longest Task Footer - Mobile Optimized Stacking */}
      <div className="pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-start gap-3 w-full">
        <Trophy className="text-amber-400 shrink-0 mt-0.5" size={16} />
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Major Focus</span>
          {longestTask ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                {longestTask.text}
              </span>
              <span className="text-[10px] text-slate-400 font-medium italic">
                {longestTask.start} - {longestTask.end}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">No active focus</span>
          )}
        </div>
      </div>
    </div>
  )
}