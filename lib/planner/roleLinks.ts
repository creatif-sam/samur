import type { CSSProperties } from 'react'
import type { PlannerTask } from '@/lib/planner/tasks'
import type { Role } from '@/lib/roles'
import { visionGradient } from '@/lib/visions'
import { taskDuration } from '@/lib/planner/tasks'

// Planner events and to-dos are linked to a role (Covey: plan the week by role), and
// optionally to one of its goals. Older items keep their vision link and still show it.

export type RoleLike = Pick<Role, 'id' | 'name' | 'emoji' | 'color' | 'is_archived'>
export type VisionLike = { id: string; title: string; emoji: string | null }

const TASK_GRADIENTS = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-600 to-blue-700',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
]
export const NO_LINK_GRADIENT = 'from-slate-500 to-slate-700'

// How an event looks: its role's own colour, else (older events) a colour from its vision,
// else neutral. A role that can't be found (deleted, or your partner's) looks neutral.
export function taskLook(
  task: Pick<PlannerTask, 'role_id' | 'vision_id'>,
  roles: Record<string, RoleLike>,
): { className: string; style?: CSSProperties; role: RoleLike | null } {
  const role = task.role_id ? roles[task.role_id] ?? null : null
  if (role) return { className: '', style: { backgroundImage: visionGradient(role.color) }, role }
  if (task.role_id) return { className: `bg-gradient-to-br ${NO_LINK_GRADIENT}`, role: null }
  if (!task.vision_id) return { className: `bg-gradient-to-br ${NO_LINK_GRADIENT}`, role: null }
  let hash = 0
  for (const ch of task.vision_id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return { className: `bg-gradient-to-br ${TASK_GRADIENTS[Math.abs(hash) % TASK_GRADIENTS.length]}`, role: null }
}

export interface RoleTime { id: string; name: string; emoji: string | null; color: string; minutes: number; count: number }

// Planned time per role, for the "Time per role" dashboard. Events with no known role
// count as unassigned; older events with only a vision are listed by vision.
export function timePerRole(
  tasks: Pick<PlannerTask, 'role_id' | 'vision_id' | 'start' | 'end'>[],
  roles: Record<string, RoleLike>,
  visions: Record<string, VisionLike>,
) {
  const byRole = new Map<string, RoleTime>()
  const byVision = new Map<string, { id: string; name: string; emoji: string | null; minutes: number; count: number }>()
  let unassigned = 0
  let total = 0
  for (const t of tasks) {
    const mins = taskDuration(t)
    if (mins <= 0) continue
    total += mins
    const role = t.role_id ? roles[t.role_id] : undefined
    if (role) {
      const r = byRole.get(role.id) ?? { id: role.id, name: role.name, emoji: role.emoji, color: role.color, minutes: 0, count: 0 }
      r.minutes += mins; r.count++
      byRole.set(role.id, r)
    } else if (!t.role_id && t.vision_id && visions[t.vision_id]) {
      const v = visions[t.vision_id]
      const e = byVision.get(v.id) ?? { id: v.id, name: v.title, emoji: v.emoji, minutes: 0, count: 0 }
      e.minutes += mins; e.count++
      byVision.set(v.id, e)
    } else {
      unassigned += mins
    }
  }
  const sort = <T extends { minutes: number; count: number; name: string }>(a: T, b: T) => b.minutes - a.minutes || b.count - a.count || a.name.localeCompare(b.name)
  return { roles: [...byRole.values()].sort(sort), olderByVision: [...byVision.values()].sort(sort), unassigned, total }
}

// A role you haven't given any time to in these events: the day summary suggests it
export function idleRole<R extends RoleLike>(tasks: Pick<PlannerTask, 'role_id'>[], activeRoles: R[]): R | null {
  const used = new Set(tasks.map(t => t.role_id).filter(Boolean))
  return activeRoles.find(r => !r.is_archived && !used.has(r.id)) ?? null
}
