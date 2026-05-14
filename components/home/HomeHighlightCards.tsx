'use client'

import Link from 'next/link'
import { Calendar, Target, BookOpen } from 'lucide-react'

interface TodayPlanner {
  morning?: string
  tasks?: { completed: boolean }[]
}

interface CurrentBook {
  title: string
  author?: string
  total_pages: number
  pages_remaining?: number
}

interface TopGoal {
  title: string
  progress?: number
}

interface Props {
  todayPlanner: TodayPlanner | null
  topGoal: TopGoal | null
  currentBook: CurrentBook | null
}

function PlannerCard({ todayPlanner }: { todayPlanner: TodayPlanner | null }) {
  return (
    <Link href="/protected/planner" className="flex-shrink-0 w-48">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-700 p-4 h-44 relative overflow-hidden">
        <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Planner</span>
          </div>
          <div>
            {todayPlanner?.morning ? (
              <p className="text-sm font-bold text-white line-clamp-3 italic leading-snug">
                "{todayPlanner.morning}"
              </p>
            ) : (
              <p className="text-sm font-semibold text-white/60">No intention set yet</p>
            )}
            {Array.isArray(todayPlanner?.tasks) && todayPlanner.tasks.length > 0 && (
              <p className="text-[10px] text-white/50 mt-1.5">
                {todayPlanner.tasks.filter(t => t.completed).length}/{todayPlanner.tasks.length} tasks done
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function GoalCard({ topGoal }: { topGoal: TopGoal | null }) {
  if (topGoal) {
    return (
      <Link href="/protected/goals" className="flex-shrink-0 w-48">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 h-44 relative overflow-hidden">
          <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Top Goal</span>
            </div>
            <div>
              <p className="text-sm font-black text-white line-clamp-2 leading-snug">{topGoal.title}</p>
              <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${topGoal.progress ?? 0}%` }} />
              </div>
              <p className="text-[10px] text-white/50 mt-1">{topGoal.progress ?? 0}% complete</p>
            </div>
          </div>
        </div>
      </Link>
    )
  }
  return (
    <Link href="/protected/goals" className="flex-shrink-0 w-48">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 h-44 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20">
        <Target className="w-8 h-8 text-white/50" />
        <p className="text-xs font-bold text-white/60 text-center">No active goals yet. Tap to add one.</p>
      </div>
    </Link>
  )
}

function BookCard({ currentBook }: { currentBook: CurrentBook | null }) {
  if (currentBook) {
    const pagesRead = currentBook.total_pages - (currentBook.pages_remaining ?? 0)
    const pct = currentBook.total_pages > 0
      ? Math.round((pagesRead / currentBook.total_pages) * 100)
      : 0

    return (
      <Link href="/protected/readapp" className="flex-shrink-0 w-48">
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 h-44 relative overflow-hidden">
          <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Reading</span>
            </div>
            <div>
              <p className="text-sm font-black text-white line-clamp-2 leading-snug">{currentBook.title}</p>
              {currentBook.author && (
                <p className="text-[10px] text-white/60 mt-0.5">{currentBook.author}</p>
              )}
              {currentBook.total_pages > 0 && (
                <>
                  <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-white/50 mt-1">{currentBook.pages_remaining ?? 0} pages left</p>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }
  return (
    <Link href="/protected/readapp" className="flex-shrink-0 w-48">
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 h-44 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20">
        <BookOpen className="w-8 h-8 text-white/50" />
        <p className="text-xs font-bold text-white/60 text-center">No book in progress. Start reading!</p>
      </div>
    </Link>
  )
}

export default function HomeHighlightCards({ todayPlanner, topGoal, currentBook }: Props) {
  return (
    <div className="mt-5">
      <div className="px-4 mb-3">
        <h3 className="text-base font-black tracking-tight">Today's Highlights</h3>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
        <PlannerCard todayPlanner={todayPlanner} />
        <GoalCard topGoal={topGoal} />
        <BookCard currentBook={currentBook} />
      </div>
    </div>
  )
}
