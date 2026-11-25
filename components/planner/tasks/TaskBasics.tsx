'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { RoleLike } from '@/lib/planner/roleLinks'

type GoalOption = { id: string; title: string; status: string; role_id: string | null }

// "Which role is this for?" (optional), then one of that role's goals (optional).
// Older events keep their vision until it is removed here.
export function TaskBasics({
  roles,
  roleId,
  goalId,
  onRoleChange,
  onGoalChange,
  olderVision,
  onClearVision,
  hideTitle = true,
  text,
  onTextChange,
}: {
  roles: RoleLike[]               // active roles to pick from; empty hides the picker
  roleId: string | null
  goalId: string | null
  onRoleChange: (roleId: string | null) => void
  onGoalChange: (goalId: string | null, roleId: string | null) => void
  olderVision?: { title: string; emoji: string | null } | null
  onClearVision?: () => void
  hideTitle?: boolean
  text?: string
  onTextChange?: (v: string) => void
}) {
  const { tr } = useTranslation()
  const [goals, setGoals] = useState<GoalOption[]>([])

  // Your goals that have a role; the list below shows the chosen role's open ones
  useEffect(() => {
    if (!roles.length) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user || cancelled) return
      const { data } = await supabase.from('goals').select('id, title, status, role_id').eq('owner_id', auth.user.id).not('role_id', 'is', null)
      if (!cancelled && data) setGoals(data as GoalOption[])
    })()
    return () => { cancelled = true }
  }, [roles.length])

  // The chosen role's unfinished goals, plus the linked one even if it is done
  const roleGoals = goals.filter(g => g.role_id === roleId && (g.status !== 'done' || g.id === goalId))

  return (
    <div className="space-y-6">
      {!hideTitle && onTextChange && (
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 block">
            {tr('Title')}
          </label>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={tr('What are you doing?')}
            className="w-full bg-slate-50 border-none rounded-[22px] p-5 text-[16px] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
          />
        </div>
      )}

      {roles.length > 0 && (
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3 block">
            {tr('Which role is this for?')}{' '}<span className="normal-case tracking-normal font-medium">{tr('(optional)')}</span>
          </label>
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              type="button"
              onClick={() => { onRoleChange(null); onGoalChange(null, null) }}
              className={cn('rounded-full border px-3 py-1.5 text-[12px] font-bold transition active:scale-95',
                !roleId ? 'border-slate-700 bg-slate-700 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40')}
            >
              {tr('No role')}
            </button>
            {roles.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onRoleChange(r.id); if (goalId && !goals.some(g => g.id === goalId && g.role_id === r.id)) onGoalChange(null, r.id) }}
                className={cn('rounded-full border px-3 py-1.5 text-[12px] font-bold transition active:scale-95',
                  roleId === r.id ? 'text-white' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300')}
                style={roleId === r.id ? { backgroundColor: r.color, borderColor: r.color } : undefined}
              >
                {r.emoji ?? '🎯'} {tr(r.name)}
              </button>
            ))}
          </div>

          {roleId && roleGoals.length > 0 && (
            <div className="mt-3 px-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                {tr('Goal it moves forward')}{' '}<span className="normal-case tracking-normal font-medium">{tr('(optional)')}</span>
              </label>
              <select
                value={goalId ?? ''}
                onChange={e => onGoalChange(e.target.value || null, roleId)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[15px] font-semibold outline-none dark:border-slate-700 dark:bg-slate-800/40 dark:text-white"
              >
                <option value="">{tr('No specific goal')}</option>
                {roleGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {olderVision && (
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <span className="shrink-0">{tr('Older vision:')}</span>
            <span className="truncate">{olderVision.emoji} {tr(olderVision.title)}</span>
            {onClearVision && (
              <button type="button" onClick={onClearVision} aria-label={tr('Remove the vision link')} className="-mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
