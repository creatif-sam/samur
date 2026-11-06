'use client'

import { Flame } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import { cn } from '@/lib/utils'
import { formatDuration, type WeekStats } from '@/lib/create'
import { parseDateKey } from '@/lib/dates'

// This week at a glance: hours, how it compares with last week, and a bar for each day
export default function CreateHero({ stats }: { stats: WeekStats }) {
  const diff = Number((stats.hours - stats.prevHours).toFixed(2))
  const max = Math.max(1, ...stats.days.map(d => d.hours))

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-5 text-white shadow-xl shadow-violet-500/20">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            This week
            <HelpTip topic="reading.create" tone="onDark" align="left" className="-my-1.5" />
          </span>
          {stats.streak > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-black">
              <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {stats.streak} day{stats.streak === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <p className="mt-2 whitespace-nowrap font-serif text-5xl font-bold leading-none tracking-tight">{stats.hours > 0 ? formatDuration(stats.hours) : '0h'}</p>
        {stats.hours > 0 || stats.prevHours > 0 ? (
          <p className={cn('mt-2 text-xs font-bold', diff >= 0 ? 'text-emerald-300' : 'text-amber-300')}>
            {diff === 0 ? 'Same as last week so far' : `${diff > 0 ? '▲' : '▼'} ${formatDuration(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than this point last week`}
          </p>
        ) : null}

        <p className="mt-1.5 text-xs text-white/75">
          {stats.sessions === 0
            ? 'No sessions yet this week. Start one below.'
            : `${stats.sessions} session${stats.sessions === 1 ? '' : 's'}${stats.focusedPct !== null ? ` · ${stats.focusedPct}% focused` : ''}`}
        </p>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {stats.days.map(d => (
            <div key={d.day} className="flex flex-col items-center gap-1.5">
              <div className="flex h-14 w-full items-end">
                <div
                  className={cn('w-full rounded-md transition-all', d.hours > 0 ? 'bg-white' : d.future ? 'bg-white/10' : 'bg-white/20')}
                  style={{ height: d.hours > 0 ? `${Math.max(12, Math.round((d.hours / max) * 100))}%` : '4px' }}
                  title={d.hours > 0 ? formatDuration(d.hours) : undefined}
                />
              </div>
              <span className={cn('text-[10px] font-bold', d.today ? 'text-white' : 'text-white/55')}>
                {parseDateKey(d.day).toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
