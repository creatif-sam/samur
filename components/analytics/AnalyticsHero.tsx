'use client'

import { Flame, Trophy } from 'lucide-react'

interface Props {
  meditationStreak: number
  goalCompletionRate: number
  totalGoals: number
  completedGoals: number
}

export default function AnalyticsHero({
  meditationStreak,
  goalCompletionRate,
  totalGoals,
  completedGoals,
}: Props) {
  const circumference = 2 * Math.PI * 32
  const dashOffset = circumference * (1 - goalCompletionRate / 100)

  return (
    <div className="px-4 mt-4">
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-xl shadow-violet-900/30">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">Growth Overview</p>

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Meditation Streak</span>
              </div>
              <p className="text-5xl font-black text-white leading-none">
                {meditationStreak}
                <span className="text-xl font-semibold text-white/50 ml-1">days</span>
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Goals Completed</span>
              </div>
              <p className="text-3xl font-black text-white leading-none">
                {completedGoals}
                <span className="text-base font-semibold text-white/50 ml-1">/ {totalGoals}</span>
              </p>
            </div>
          </div>

          {/* Circular completion ring */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle
                  cx="40" cy="40" r="32"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="8"
                />
                <circle
                  cx="40" cy="40" r="32"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-black text-white leading-none">{goalCompletionRate}%</p>
                <p className="text-[8px] font-bold text-white/50 uppercase tracking-wide">Done</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider text-center">Goal Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}
