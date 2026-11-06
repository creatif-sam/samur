import type { SupabaseClient } from '@supabase/supabase-js'

// Daily prayer target (minutes), set per month. A month without its own target
// uses the most recent earlier month's, so setting November never changes October.

export const DEFAULT_TARGET = 60
export const MIN_TARGET = 5
export const MAX_TARGET = 600
export const TARGET_PRESETS = [15, 30, 45, 60, 90, 120]

export type Targets = Record<string, number> // 'YYYY-MM' -> minutes

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function clampTarget(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_TARGET
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(n)))
}

export function targetFor(targets: Targets, month: string): { minutes: number; from: string | null } {
  if (month in targets) return { minutes: clampTarget(targets[month]), from: month }
  const earlier = Object.keys(targets).filter(k => k < month).sort().pop()
  return earlier ? { minutes: clampTarget(targets[earlier]), from: earlier } : { minutes: DEFAULT_TARGET, from: null }
}

// Calendar and graph colours: green at the target, amber from half of it, red below.
// At the default 60 this is the familiar 60m+ / 30–59m / under 30m.
export const amberFrom = (target: number) => Math.max(1, Math.round(target / 2))

export function toneFor(minutes: number, target: number): 'green' | 'amber' | 'red' {
  return minutes >= target ? 'green' : minutes >= amberFrom(target) ? 'amber' : 'red'
}

function sanitize(raw: unknown): Targets {
  const out: Targets = {}
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(k) && typeof v === 'number') out[k] = clampTarget(v)
    }
  }
  return out
}

// ── Storage ───────────────────────────────────────────────────────────────────
// The account (user_preferences.prayer_targets) is the source of truth. Until its migration
// has been run, targets are kept on this device and folded into the account on the next save.

const LOCAL_KEY = 'prayer-targets'

function readLocal(): Targets {
  try {
    return sanitize(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'))
  } catch {
    return {}
  }
}
function writeLocal(t: Targets) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(t))
  } catch {}
}

const columnMissing = (msg?: string) => !!msg && /prayer_targets/.test(msg)

export async function loadTargets(supabase: SupabaseClient, userId: string): Promise<{ targets: Targets; synced: boolean }> {
  const res = await supabase.from('user_preferences').select('prayer_targets').eq('user_id', userId).maybeSingle()
  const local = readLocal()
  if (res.error) return { targets: local, synced: false } // column not there yet (or offline): use the device copy
  // The account wins for any month it has; months only set on this device are kept
  return { targets: { ...local, ...sanitize((res.data as { prayer_targets?: unknown } | null)?.prayer_targets) }, synced: true }
}

export type SaveResult = { result: 'ok' | 'device' | 'error'; targets: Targets }

export async function saveTarget(supabase: SupabaseClient, userId: string, current: Targets, month: string, minutes: number): Promise<SaveResult> {
  // `current` already includes months that exist only on this device, so they are folded in here
  const next: Targets = { ...current, [month]: clampTarget(minutes) }
  const { error } = await supabase.from('user_preferences').upsert({ user_id: userId, prayer_targets: next })
  if (!error) {
    writeLocal(next)
    return { result: 'ok', targets: next }
  }
  if (columnMissing(error.message)) {
    writeLocal(next)
    return { result: 'device', targets: next }
  }
  return { result: 'error', targets: current }
}
