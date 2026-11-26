import type { SupabaseClient } from '@supabase/supabase-js'

// Today's three most important things, chosen in the morning and ticked off in the evening.
// Kept in their own table (migration 20261127000000_planner_priorities) so the rest of the
// planner keeps saving even before that update is run; until then they stay on this device.

export interface Priority {
  id: string
  text: string
  done: boolean
  rock_id?: string
  todo_id?: string
}

export const MAX_PRIORITIES = 3

export function addPriority(list: Priority[], item: Omit<Priority, 'id' | 'done'> & { id?: string }): Priority[] {
  const text = item.text.trim()
  if (!text || list.length >= MAX_PRIORITIES) return list
  const dupe = list.some(p => p.text.toLowerCase() === text.toLowerCase() || (item.rock_id && p.rock_id === item.rock_id) || (item.todo_id && p.todo_id === item.todo_id))
  if (dupe) return list
  return [...list, { ...item, text, id: item.id ?? crypto.randomUUID(), done: false }]
}

export const togglePriority = (list: Priority[], id: string) => list.map(p => (p.id === id ? { ...p, done: !p.done } : p))
export const removePriority = (list: Priority[], id: string) => list.filter(p => p.id !== id)

// Clean whatever was stored: three at most, each with words
export function cleanPriorities(raw: unknown): Priority[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Priority => !!p && typeof p === 'object' && typeof (p as Priority).id === 'string' && typeof (p as Priority).text === 'string' && !!(p as Priority).text.trim())
    .map(p => ({ id: p.id, text: p.text.trim().slice(0, 200), done: !!p.done, ...(p.rock_id ? { rock_id: p.rock_id } : {}), ...(p.todo_id ? { todo_id: p.todo_id } : {}) }))
    .slice(0, MAX_PRIORITIES)
}

const missing = (msg?: string) => !!msg && /schema cache|does not exist|could not find the table/i.test(msg)
const offline = (err: unknown) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
}
const localKey = (userId: string, day: string) => `planner-top3:${userId}:${day}`
const OUTBOX = 'planner-top3-outbox:v1'

function readLocal(userId: string, day: string) {
  try { return cleanPriorities(JSON.parse(localStorage.getItem(localKey(userId, day)) ?? '[]')) } catch { return [] }
}
function writeLocal(userId: string, day: string, items: Priority[]) {
  try {
    if (items.length) localStorage.setItem(localKey(userId, day), JSON.stringify(items))
    else localStorage.removeItem(localKey(userId, day))
  } catch { /* storage unavailable */ }
}

// Saves made offline wait here (latest per day wins) until the connection is back
type Outbox = Record<string, { user_id: string; day: string; items: Priority[] }>
function readOutbox(): Outbox {
  try { return JSON.parse(localStorage.getItem(OUTBOX) ?? '{}') } catch { return {} }
}
function writeOutbox(box: Outbox) {
  try {
    if (Object.keys(box).length) localStorage.setItem(OUTBOX, JSON.stringify(box))
    else localStorage.removeItem(OUTBOX)
  } catch { /* storage unavailable */ }
}
export function queuedPriorities(userId: string, day: string) {
  const q = readOutbox()[`${userId}|${day}`]
  return q ? cleanPriorities(q.items) : null
}

// `synced` is false when the table isn't there yet (then the device copy is used).
// Offline, the waiting copy (or nothing) is shown and `offline` is true.
export async function loadPriorities(supabase: SupabaseClient, userId: string, day: string): Promise<{ items: Priority[]; synced: boolean; offline?: boolean }> {
  const queued = queuedPriorities(userId, day)
  let res
  try {
    res = await supabase.from('planner_priorities').select('items').eq('user_id', userId).eq('day', day).maybeSingle()
  } catch (err) {
    if (offline(err)) return { items: queued ?? [], synced: true, offline: true }
    throw err
  }
  const { data, error } = res
  if (error) {
    if (missing(error.message)) return { items: readLocal(userId, day), synced: false }
    if (offline(error)) return { items: queued ?? [], synced: true, offline: true }
    throw error
  }
  // A change made offline is newer than what the server has
  return { items: queued ?? cleanPriorities(data?.items), synced: true }
}

// Returns 'queued' when there was no connection: it will be sent by flushPriorities
export async function savePriorities(supabase: SupabaseClient, userId: string, day: string, items: Priority[], synced: boolean): Promise<'saved' | 'queued'> {
  if (!synced) { writeLocal(userId, day, items); return 'saved' }
  const row = { user_id: userId, day, items, updated_at: new Date().toISOString() }
  let error: unknown = null
  try {
    ({ error } = await supabase.from('planner_priorities').upsert(row, { onConflict: 'user_id,day' }))
  } catch (err) { error = err }
  if (error && offline(error)) {
    writeOutbox({ ...readOutbox(), [`${userId}|${day}`]: { user_id: userId, day, items } })
    return 'queued'
  }
  if (error) throw error
  const box = readOutbox()
  if (box[`${userId}|${day}`]) { delete box[`${userId}|${day}`]; writeOutbox(box) }
  return 'saved'
}

// Sends what was saved offline; returns how many days were sent
export async function flushPriorities(supabase: SupabaseClient, userId: string) {
  const box = readOutbox()
  let sent = 0
  for (const [key, q] of Object.entries(box)) {
    if (q.user_id !== userId) continue
    const { error } = await supabase.from('planner_priorities')
      .upsert({ user_id: userId, day: q.day, items: cleanPriorities(q.items), updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' })
    if (error) continue
    delete box[key]
    sent++
  }
  writeOutbox(box)
  return sent
}
