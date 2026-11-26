'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { timePerRole, type RoleLike, type VisionLike } from '@/lib/planner/roleLinks'
import type { PlannerTask } from '@/lib/planner/tasks'

const hours = (mins: number) => {
  const h = mins / 60
  return h >= 10 ? Math.round(h).toString() : (Math.round(h * 10) / 10).toString()
}

// How a week's planned time is shared between roles: a bar and a chip per role
export default function WeekBalance({ tasks, rolesMap, visionsMap = {}, compact }: {
  tasks: Pick<PlannerTask, 'role_id' | 'vision_id' | 'start' | 'end'>[]
  rolesMap: Record<string, RoleLike>
  visionsMap?: Record<string, VisionLike>
  compact?: boolean
}) {
  const { tr } = useTranslation()
  const t = timePerRole(tasks, rolesMap, visionsMap)
  if (t.total === 0) return <p className="text-xs text-muted-foreground">{tr('No planned time in this period yet.')}</p>
  const older = t.olderByVision.reduce((s, v) => s + v.minutes, 0)
  const idle = Object.values(rolesMap).filter(r => !r.is_archived && !t.roles.some(x => x.id === r.id))
  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {t.roles.map(r => <div key={r.id} style={{ width: `${(r.minutes / t.total) * 100}%`, backgroundColor: r.color }} />)}
        {older > 0 && <div style={{ width: `${(older / t.total) * 100}%` }} className="bg-indigo-300 dark:bg-indigo-700" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {t.roles.map(r => (
          <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
            {r.emoji} {tr(r.name)} <span className="tabular-nums text-muted-foreground">{hours(r.minutes)}h</span>
          </span>
        ))}
        {t.unassigned > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {tr('No role')} <span className="tabular-nums">{hours(t.unassigned)}h</span>
          </span>
        )}
      </div>
      {!compact && idle.length > 0 && (
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          {tr('No time yet for {roles}', { roles: idle.map(r => `${r.emoji ?? ''} ${tr(r.name)}`.trim()).join(', ') })}
        </p>
      )}
    </div>
  )
}
