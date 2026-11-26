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
const localKey = (userId: string, day: string) => `planner-top3:${userId}:${day}`

function readLocal(userId: string, day: string) {
  try { return cleanPriorities(JSON.parse(localStorage.getItem(localKey(userId, day)) ?? '[]')) } catch { return [] }
}
function writeLocal(userId: string, day: string, items: Priority[]) {
  try {
    if (items.length) localStorage.setItem(localKey(userId, day), JSON.stringify(items))
    else localStorage.removeItem(localKey(userId, day))
  } catch { /* storage unavailable */ }
}

// `synced` is false when the table isn't there yet (then the device copy is used)
export async function loadPriorities(supabase: SupabaseClient, userId: string, day: string): Promise<{ items: Priority[]; synced: boolean }> {
  const { data, error } = await supabase.from('planner_priorities').select('items').eq('user_id', userId).eq('day', day).maybeSingle()
  if (error) {
    if (missing(error.message)) return { items: readLocal(userId, day), synced: false }
    throw error
  }
  return { items: cleanPriorities(data?.items), synced: true }
}

export async function savePriorities(supabase: SupabaseClient, userId: string, day: string, items: Priority[], synced: boolean) {
  if (!synced) { writeLocal(userId, day, items); return }
  const { error } = await supabase.from('planner_priorities').upsert({ user_id: userId, day, items, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' })
  if (error) throw error
}
