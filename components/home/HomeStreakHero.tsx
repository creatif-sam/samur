'use client'

import Link from 'next/link'
import { Flame, Play } from 'lucide-react'

interface Props {
  streak: number
}

export default function HomeStreakHero({ streak }: Props) {
  return (
    <div className="px-4 mt-4">
      <Link href="/protected/meditations">
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-xl shadow-violet-900/30">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                  Meditation Streak
                </span>
              </div>
              <p className="text-5xl font-black text-white leading-none">
                {streak}
                <span className="text-xl font-semibold text-white/60 ml-1">days</span>
              </p>
              <p className="text-xs text-white/50 pt-1">
                {streak > 0 ? 'Keep the fire burning 🔥' : 'Start your first meditation today'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-[10px] text-white/50 font-semibold">Open</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
