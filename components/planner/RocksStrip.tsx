'use client'

import Link from 'next/link'
import { useTranslation } from '@/contexts/TranslationContext'
import { CalendarPlus, Mountain } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import type { WeeklyRock } from '@/lib/roles'
import type { RoleLike } from '@/lib/planner/roleLinks'
import { rockTarget, type RockProgress } from '@/lib/planner/week'

// This week's big rocks that have no time yet: put them in the day first (Covey, Habit 3)
export default function RocksStrip({ rocks, total, rolesMap, progress = {}, onSchedule }: {
  rocks: WeeklyRock[]               // unscheduled, unfinished
  total: number                     // rocks planned this week
  rolesMap: Record<string, RoleLike>
  progress?: RockProgress            // sessions booked and done this week
  onSchedule: (rock: WeeklyRock) => void
}) {
  const { tr } = useTranslation()
  return (
    <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
      <div className="mb-2 flex items-center gap-1">
        <Mountain className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{tr('Big rocks this week')}</span>
        <HelpTip topic="planner.rocks" align="left" className="-my-1" />
      </div>
      {total === 0 ? (
        <Link href="/protected/goals?tab=week" className="block text-xs font-semibold text-violet-600 dark:text-violet-400">
          {tr('Choose one or two big rocks per role for this week →')}
        </Link>
      ) : rocks.length === 0 ? (
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{tr('Every big rock has time booked or is done ✓')}</p>
      ) : (
        <ul className="space-y-1.5">
          {rocks.map(r => {
            const role = r.role_id ? rolesMap[r.role_id] : null
            return (
              <li key={r.id} className="flex items-center gap-2.5">
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ backgroundColor: role?.color ?? '#0d9488' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.text}</span>
                  <span className="block truncate text-[10px] text-slate-400">
                    {role ? `${role.emoji ?? ''} ${tr(role.name)}` : `🪚 ${tr('Sharpen the saw')}`}
                    {rockTarget(r) > 1 && ` · ${tr('{booked} of {target} sessions booked', { booked: progress[r.id]?.booked ?? 0, target: rockTarget(r) })}`}
                  </span>
                </span>
                <button
                  onClick={() => onSchedule(r)}
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-700 active:scale-95 dark:bg-violet-900/40 dark:text-violet-300"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> {tr('Schedule')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
