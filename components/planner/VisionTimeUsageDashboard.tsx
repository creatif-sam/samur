'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useMemo, useState } from 'react'
import { ChevronDown, Scale } from 'lucide-react'
import type { PlannerTask } from './DailyPlanner'
import { addDays, toLocalDateKey } from '@/lib/dates'
import { timePerRole, type RoleLike, type VisionLike } from '@/lib/planner/roleLinks'
import { cn } from '@/lib/utils'

type Period = 'week' | 'month' | 'year'
const PERIOD_LABEL: Record<Period, string> = { week: 'Week', month: 'Month', year: 'Year' }

interface DashboardProps {
  allTasks: (PlannerTask & { day?: string })[]
  rolesMap: Record<string, RoleLike>
  visionsMap: Record<string, VisionLike>
}

const hours = (mins: number) => {
  const h = mins / 60
  return h >= 10 ? Math.round(h).toString() : (Math.round(h * 10) / 10).toString()
}

// Planned time per role (Covey's balance check): a bar showing the share of each role,
// then each role's hours. Older events with only a vision are listed apart.
export default function RoleTimeDashboard({ allTasks, rolesMap, visionsMap }: DashboardProps) {
  const { tr } = useTranslation()
  const [period, setPeriod] = useState<Period>('week')
  const [showOlder, setShowOlder] = useState(false)

  const stats = useMemo(() => {
    const today = toLocalDateKey(new Date())
    const since = addDays(today, period === 'week' ? -6 : period === 'month' ? -29 : -364)
    const inPeriod = allTasks.filter(t => !t.day || (t.day >= since && t.day <= today))
    return timePerRole(inPeriod, rolesMap, visionsMap)
  }, [allTasks, period, rolesMap, visionsMap])

  const linked = stats.roles.reduce((s, r) => s + r.minutes, 0)
  const share = (mins: number) => (stats.total ? Math.round((mins / stats.total) * 100) : 0)
  const olderMinutes = stats.olderByVision.reduce((s, v) => s + v.minutes, 0)

  return (
    <div className="w-full space-y-5 rounded-3xl bg-muted/30 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl bg-violet-600 p-2.5 text-white shadow-lg shadow-violet-900/30">
            <Scale size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-0.5">
              <h3 className="text-base font-black tracking-tight text-foreground">{tr('Time per role')}</h3>
              <HelpTip topic="analytics.visionTime" align="left" className="-my-1" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tr('Planned hours · {total}h', { total: hours(stats.total) })}</p>
          </div>
        </div>
        <div className="flex w-full rounded-2xl bg-muted/60 p-1">
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn('flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all', period === p ? 'bg-violet-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {tr(PERIOD_LABEL[p])}
            </button>
          ))}
        </div>
      </div>

      {stats.total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{tr('No planned time in this period yet.')}</p>
      ) : (
        <>
          {/* The balance of the period at a glance */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {stats.roles.map(r => (
              <div key={r.id} title={`${tr(r.name)} · ${share(r.minutes)}%`} style={{ width: `${(r.minutes / stats.total) * 100}%`, backgroundColor: r.color }} />
            ))}
            {olderMinutes > 0 && <div style={{ width: `${(olderMinutes / stats.total) * 100}%` }} className="bg-indigo-300 dark:bg-indigo-700" />}
          </div>

          {linked === 0 && (
            <p className="rounded-2xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
              {tr('Link events to a role when you plan them to see how your time is shared between your roles.')}
            </p>
          )}

          <ul className="space-y-2.5">
            {stats.roles.map(r => (
              <li key={r.id}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-base">{r.emoji ?? '🎯'}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{tr(r.name)}</span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">{share(r.minutes)}%</span>
                  <span className="w-12 text-right font-black tabular-nums">{hours(r.minutes)}h</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.minutes / Math.max(...stats.roles.map(x => x.minutes))) * 100)}%`, backgroundColor: r.color }} />
                </div>
              </li>
            ))}
            {stats.unassigned > 0 && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-base">·</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{tr('No role')}</span>
                <span className="text-xs font-semibold tabular-nums">{share(stats.unassigned)}%</span>
                <span className="w-12 text-right font-bold tabular-nums">{hours(stats.unassigned)}h</span>
              </li>
            )}
          </ul>

          {stats.olderByVision.length > 0 && (
            <div className="rounded-2xl bg-muted/40 p-3">
              <button onClick={() => setShowOlder(s => !s)} className="flex w-full items-center justify-between text-left">
                <span className="text-xs font-bold text-muted-foreground">{tr('Older events (by vision) · {h}h', { h: hours(olderMinutes) })}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showOlder && 'rotate-180')} />
              </button>
              {showOlder && (
                <ul className="mt-2 space-y-1.5">
                  {stats.olderByVision.map(v => (
                    <li key={v.id} className="flex items-center gap-2 text-sm">
                      <span>{v.emoji}</span>
                      <span className="min-w-0 flex-1 truncate">{tr(v.name)}</span>
                      <span className="font-bold tabular-nums">{hours(v.minutes)}h</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
