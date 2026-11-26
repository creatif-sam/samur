import { formatMinutes, parseMinutes, taskDuration } from '@/lib/planner/tasks'

// Moving and resizing events on the timeline, in whole steps of 15 minutes.
export const SNAP = 15
export const MIN_LENGTH = 15

export const snap = (minutes: number, step = SNAP) => Math.round(minutes / step) * step || 0

// Pixels dragged → minutes, at the timeline's scale
export const pxToMinutes = (px: number, pxPerHour: number) => (px / pxPerHour) * 60

// Move: keep the length, stay inside the day (an event may still run past midnight)
export function moveBy(task: { start: string; end: string }, deltaMinutes: number) {
  const length = taskDuration(task)
  const start = Math.min(Math.max(0, snap(parseMinutes(task.start) + deltaMinutes)), 1440 - SNAP)
  return { start: formatMinutes(start), end: formatMinutes((start + length) % 1440) }
}

// Resize from the bottom edge: at least 15 minutes, at most to midnight
export function resizeBy(task: { start: string; end: string }, deltaMinutes: number) {
  const start = parseMinutes(task.start)
  const length = Math.min(Math.max(MIN_LENGTH, snap(taskDuration(task) + deltaMinutes)), 1440 - start)
  return { start: task.start, end: formatMinutes((start + length) % 1440) }
}
