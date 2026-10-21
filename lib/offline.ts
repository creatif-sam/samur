// Offline support shared by the Supabase client, the offline banner and editors.

import type { User } from '@supabase/supabase-js'

// Must match DATA_CACHE in public/sw.js
export const DATA_CACHE = 'mastery-data'
export const OFFLINE_WRITE_MESSAGE = "You're offline. This will work when you reconnect."

const USER_KEY = 'mastery-offline-user'
const DRAFT_PREFIX = 'mastery-draft:'

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

// ---------- last confirmed user (offline fallback for auth.getUser) ----------

export function cacheUser(user: User) {
  try {
    storage()?.setItem(USER_KEY, JSON.stringify(user))
  } catch { /* storage full or blocked */ }
}

export function cachedUser(): User | null {
  try {
    const raw = storage()?.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function cachedUserId() {
  return cachedUser()?.id ?? null
}

// Forget everything saved for offline use (on sign-out or when another account signs in).
// Unsent planner changes and drafts are kept: they belong to their author and sync later.
export async function clearOfflineData() {
  try { storage()?.removeItem(USER_KEY) } catch { /* ignore */ }
  try {
    if (typeof caches !== 'undefined') await caches.delete(DATA_CACHE)
  } catch { /* ignore */ }
}

// ---------- local drafts for editors ----------

export function loadDraft<T>(key: string): (T & { savedAt: number }) | null {
  try {
    const raw = storage()?.getItem(DRAFT_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft<T extends object>(key: string, value: T) {
  try {
    storage()?.setItem(DRAFT_PREFIX + key, JSON.stringify({ ...value, savedAt: Date.now() }))
  } catch { /* storage full or blocked */ }
}

export function clearDraft(key: string) {
  try { storage()?.removeItem(DRAFT_PREFIX + key) } catch { /* ignore */ }
}
