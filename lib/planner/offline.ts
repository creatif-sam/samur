// Offline outbox for planner day saves. When a save fails for lack of network,
// the row is kept in localStorage (latest version per day wins) and written
// once the connection is back.

import type { PlannerTask } from './tasks'

export type QueuedDay = {
  day: string
  user_id: string
  tasks: PlannerTask[]
  completed_task_ids: string[]
  morning: string
  reflection: string
  mood: string
  visibility: 'private'
}

const STORAGE_KEY = 'planner-outbox:v1'

function read(): Record<string, QueuedDay> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function write(outbox: Record<string, QueuedDay>) {
  try {
    if (Object.keys(outbox).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(outbox))
  } catch {
    // Storage full or blocked: nothing more we can do offline
  }
}

const keyOf = (userId: string, day: string) => `${userId}|${day}`

export function queueDay(row: QueuedDay) {
  const outbox = read()
  outbox[keyOf(row.user_id, row.day)] = row
  write(outbox)
}

export function dequeueDay(userId: string, day: string) {
  const outbox = read()
  if (!(keyOf(userId, day) in outbox)) return
  delete outbox[keyOf(userId, day)]
  write(outbox)
}

export function queuedDays(userId: string) {
  return Object.values(read()).filter(r => r.user_id === userId)
}

export function queuedDay(userId: string, day: string): QueuedDay | undefined {
  return read()[keyOf(userId, day)]
}

export function isNetworkError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
}
