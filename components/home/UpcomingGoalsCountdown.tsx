'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Target, ChevronRight, Flag } from 'lucide-react'

interface Goal {
  id: string
  title: string
  due_date: string
  status: string
}

interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  overdue: boolean
}

function getCountdown(dueDateStr: string): Countdown {
  const due = new Date(dueDateStr)
  due.setHours(23, 59, 59, 999) // end of due day
  const now = Date.now()
  const diff = due.getTime() - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, overdue: true }
  }

  const totalSecs = Math.floor(diff / 1000)
  const days    = Math.floor(totalSecs / 86400)
  const hours   = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const seconds = totalSecs % 60

  return { days, hours, minutes, seconds, overdue: false }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function GoalCard({ goal }: { goal: Goal }) {
  const [cd, setCd] = useState<Countdown>(() => getCountdown(goal.due_date))

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(goal.due_date)), 1000)
    return () => clearInterval(id)
  }, [goal.due_date])

  const isUrgent = !cd.overdue && cd.days < 3

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-4 border transition-colors duration-300 ${
        cd.overdue
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40'
          : isUrgent
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      }`}
    >
      {/* decorative accent circle */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 bg-violet-500 pointer-events-none" />

      {/* Title */}
      <div className="flex items-start gap-2 mb-3">
        <Flag
          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
            cd.overdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-violet-500'
          }`}
        />
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
          {goal.title}
        </p>
      </div>

      {/* Countdown display */}
      {cd.overdue ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Overdue</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          {/* Days */}
          <div className="flex flex-col items-center bg-slate-900 dark:bg-slate-700 rounded-xl px-2 py-1 min-w-[36px]">
            <span className="text-[16px] font-black text-white tabular-nums leading-none">{pad(cd.days)}</span>
            <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider mt-0.5">d</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 font-black text-sm">:</span>
          {/* Hours */}
          <div className="flex flex-col items-center bg-slate-900 dark:bg-slate-700 rounded-xl px-2 py-1 min-w-[36px]">
            <span className="text-[16px] font-black text-white tabular-nums leading-none">{pad(cd.hours)}</span>
            <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider mt-0.5">h</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 font-black text-sm">:</span>
          {/* Minutes */}
          <div className="flex flex-col items-center bg-slate-900 dark:bg-slate-700 rounded-xl px-2 py-1 min-w-[36px]">
            <span className="text-[16px] font-black text-white tabular-nums leading-none">{pad(cd.minutes)}</span>
            <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider mt-0.5">m</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 font-black text-sm">:</span>
          {/* Seconds */}
          <div className={`flex flex-col items-center rounded-xl px-2 py-1 min-w-[36px] ${isUrgent ? 'bg-amber-500' : 'bg-violet-600'}`}>
            <span className="text-[16px] font-black text-white tabular-nums leading-none">{pad(cd.seconds)}</span>
            <span className="text-[7px] font-bold text-white/60 uppercase tracking-wider mt-0.5">s</span>
          </div>
        </div>
      )}

      {/* Due date label */}
      <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
        Due {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}

export default function UpcomingGoalsCountdown() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('goals')
        .select('id, title, due_date, status')
        .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5)

      setGoals(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || goals.length === 0) return null

  return (
    <div className="px-4 mt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upcoming Goals</p>
            <p className="text-[11px] font-semibold text-muted-foreground/60">Live countdown</p>
          </div>
        </div>
        <Link
          href="/protected/goals"
          className="flex items-center gap-1 text-[11px] font-bold text-violet-500 dark:text-violet-400"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  )
}
