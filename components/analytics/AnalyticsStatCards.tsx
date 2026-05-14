'use client'

import { Flame, Brain, Target, CheckCircle2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  meditationStreak: number
  totalSessions: number
  activeGoalsCount: number
  completedGoalsCount: number
  booksRead: number
}

const CARDS = [
  {
    key: 'streak',
    label: 'Streak',
    unit: 'days',
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    shadow: 'shadow-orange-900/30',
  },
  {
    key: 'sessions',
    label: 'Med. Sessions',
    unit: 'total',
    icon: Brain,
    gradient: 'from-violet-600 to-purple-700',
    shadow: 'shadow-violet-900/30',
  },
  {
    key: 'active',
    label: 'Active Goals',
    unit: 'running',
    icon: Target,
    gradient: 'from-blue-600 to-cyan-700',
    shadow: 'shadow-blue-900/30',
  },
  {
    key: 'done',
    label: 'Goals Done',
    unit: 'complete',
    icon: CheckCircle2,
    gradient: 'from-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-900/30',
  },
  {
    key: 'books',
    label: 'Books Read',
    unit: 'finished',
    icon: BookOpen,
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-900/30',
  },
]

export default function AnalyticsStatCards({
  meditationStreak,
  totalSessions,
  activeGoalsCount,
  completedGoalsCount,
  booksRead,
}: Props) {
  const values: Record<string, number> = {
    streak: meditationStreak,
    sessions: totalSessions,
    active: activeGoalsCount,
    done: completedGoalsCount,
    books: booksRead,
  }

  return (
    <div className="mt-4">
      <div className="px-4 mb-3">
        <h3 className="text-base font-black tracking-tight">Your Stats</h3>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
        {CARDS.map(({ key, label, unit, icon: Icon, gradient, shadow }) => (
          <div
            key={key}
            className={cn(
              'flex-shrink-0 w-32 rounded-3xl bg-gradient-to-br p-4 shadow-lg',
              gradient,
              shadow
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-3xl font-black text-white leading-none">{values[key]}</p>
            <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">{unit}</p>
            <p className="text-xs font-semibold text-white/80 mt-2 leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
