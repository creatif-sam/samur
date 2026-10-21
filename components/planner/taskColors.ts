import type { PlannerTask } from '@/lib/planner/tasks'

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
const NO_VISION_GRADIENT = 'from-slate-500 to-slate-700'

// Same vision → same colour, whatever the order of the day's tasks
export function gradientFor(task: Pick<PlannerTask, 'vision_id'>) {
  if (!task.vision_id) return NO_VISION_GRADIENT
  let hash = 0
  for (const ch of task.vision_id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TASK_GRADIENTS[Math.abs(hash) % TASK_GRADIENTS.length]
}
