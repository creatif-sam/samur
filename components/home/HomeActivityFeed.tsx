'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Flame, Target, CheckCircle2, ChevronRight, TrendingUp, LucideIcon } from 'lucide-react'

interface Props {
  meditationStreak: number
  activeGoalsCount: number
  completedGoalsCount: number
  dueTodayCount: number
}

interface ActivityRowProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  href: string
}

function ActivityRow({ icon, iconBg, label, value, href }: ActivityRowProps) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 active:scale-[0.98] transition-all">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <p className="flex-1 text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-foreground">{value}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

export default function HomeActivityFeed({
  meditationStreak,
  activeGoalsCount,
  completedGoalsCount,
  dueTodayCount,
}: Props) {
  return (
    <div className="px-4 mt-5">
      <h3 className="text-base font-black tracking-tight mb-3">Recent Activity</h3>
      <div className="space-y-2">
        <ActivityRow
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          iconBg="bg-orange-100 dark:bg-orange-950/40"
          label="Meditation Streak"
          value={`${meditationStreak} day${meditationStreak !== 1 ? 's' : ''}`}
          href="/protected/meditations"
        />
        <ActivityRow
          icon={<Target className="w-5 h-5 text-violet-500" />}
          iconBg="bg-violet-100 dark:bg-violet-950/40"
          label="Active Goals"
          value={`${activeGoalsCount} in progress`}
          href="/protected/goals"
        />
        <ActivityRow
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          label="Goals Completed"
          value={`${completedGoalsCount} done`}
          href="/protected/goals"
        />
        <ActivityRow
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-100 dark:bg-blue-950/40"
          label="Due Today"
          value={`${dueTodayCount} goal${dueTodayCount !== 1 ? 's' : ''}`}
          href="/protected/planner"
        />
      </div>
    </div>
  )
}
