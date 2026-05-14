'use client'

import Link from 'next/link'
import { Target, CheckCircle2, ChevronRight } from 'lucide-react'
import { Goal } from '@/lib/types'

interface Props {
  goals: Goal[]
}

export default function AnalyticsGoalSection({ goals }: Props) {
  const done   = goals.filter(g => g.status === 'done')
  const active = goals.filter(g => g.status !== 'done')
  const total  = goals.length
  const rate   = total > 0 ? Math.round((done.length / total) * 100) : 0
  const top3   = active.slice(0, 3)

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black tracking-tight">Goals Breakdown</h3>
        <Link href="/protected/goals" className="text-xs font-bold text-violet-500">
          See all →
        </Link>
      </div>

      {/* Completion overview */}
      <div className="bg-muted/30 rounded-3xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-sm font-bold">{done.length} done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <span className="text-sm font-bold">{active.length} active</span>
          </div>
          <span className="text-xl font-black text-violet-500">{rate}%</span>
        </div>

        {/* Stacked progress bar */}
        <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
          <div className="bg-violet-500/30 h-full flex-1" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">Completion rate</span>
          <span className="text-[10px] text-muted-foreground font-medium">{total} total goals</span>
        </div>
      </div>

      {/* Top active goals */}
      {top3.length > 0 && (
        <div className="space-y-2">
          {top3.map(goal => (
            <Link key={goal.id} href="/protected/goals">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{goal.title}</p>
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${goal.progress ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs font-black text-violet-500">{goal.progress ?? 0}%</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Target className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">No goals yet.</p>
          <Link href="/protected/goals" className="text-xs font-bold text-violet-500">Add your first goal →</Link>
        </div>
      )}
    </div>
  )
}
