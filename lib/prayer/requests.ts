import type { SupabaseClient } from '@supabase/supabase-js'
import { trNow } from '@/lib/i18n'
import { loadLastPrayed, markPrayed } from '@/lib/prayer/session'

// Prayer requests: yours, your partner's shared ones, who prayed for them and when,
// and the daily prayer reminder times. Works before the prayer update is run
// (20261129000000_prayer_partner.sql): then nothing is shared, the history stays on
// this device and reminders can't be set yet.

export type Category = 'personal' | 'family' | 'intercession' | 'guidance' | 'healing' | 'thanksgiving'
export type Status = 'active' | 'answered' | 'ongoing'

export interface PrayerRequest {
  id: string
  user_id?: string
  title: string
  description: string | null
  category: Category
  status: Status
  is_shared: boolean
  answer_note: string | null
  answered_at: string | null
  created_at: string
  verse_ref?: string | null   // a promise to pray with, e.g. "Philippians 4:6"
  verse_text?: string | null
}

// Who prayed for a request: your own last time, and your partner's prayers for your shared ones
export interface PrayerHistory {
  lastPrayed: Record<string, string>              // request id -> when you last prayed for it
  partnerPrayers: Record<string, { count: number; last: string }>
}

const missing = (msg?: string) => !!msg && /schema cache|does not exist|could not find the (table|.* column)/i.test(msg)
export const isMissingPrayerUpdate = missing

export async function loadPartner(supabase: SupabaseClient, userId: string) {
  const { data: me } = await supabase.from('profiles').select('partner_id').eq('id', userId).maybeSingle()
  const partnerId = (me?.partner_id as string | null) ?? null
  if (!partnerId) return null
  const { data: p } = await supabase.from('profiles').select('id, name').eq('id', partnerId).maybeSingle()
  return { id: partnerId, name: (p?.name as string | null) ?? null }
}

// Your partner's active shared requests (none until the update allows reading them)
export async function loadPartnerRequests(supabase: SupabaseClient, partnerId: string): Promise<PrayerRequest[]> {
  const { data, error } = await supabase.from('prayer_requests').select('*')
    .eq('user_id', partnerId).eq('is_shared', true).in('status', ['active', 'ongoing'])
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as PrayerRequest[]
}

export async function loadHistory(supabase: SupabaseClient, userId: string, ownIds: string[]): Promise<PrayerHistory> {
  const device = loadLastPrayed()
  const { data, error } = await supabase.from('prayer_request_prayers').select('request_id, user_id, prayed_at')
    .order('prayed_at', { ascending: false }).limit(2000)
  if (error) return { lastPrayed: device, partnerPrayers: {} }
  return mergeHistory((data ?? []) as PrayerLog[], userId, ownIds, device)
}

export type PrayerLog = { request_id: string; user_id: string; prayed_at: string }

// Pure: your latest prayer per request (newest of server and this device) and your
// partner's prayers on your own requests
export function mergeHistory(logs: PrayerLog[], userId: string, ownIds: string[], device: Record<string, string> = {}): PrayerHistory {
  const lastPrayed: Record<string, string> = { ...device }
  const partnerPrayers: PrayerHistory['partnerPrayers'] = {}
  const own = new Set(ownIds)
  for (const l of logs) {
    if (l.user_id === userId) {
      if (!lastPrayed[l.request_id] || lastPrayed[l.request_id] < l.prayed_at) lastPrayed[l.request_id] = l.prayed_at
    } else if (own.has(l.request_id)) {
      const p = (partnerPrayers[l.request_id] ??= { count: 0, last: l.prayed_at })
      p.count++
      if (p.last < l.prayed_at) p.last = l.prayed_at
    }
  }
  return { lastPrayed, partnerPrayers }
}

// Record that these requests were prayed for (on this device too, so it works offline)
// One insert per request, so one refused row (e.g. a request un-shared meanwhile) loses nothing else
export async function logPrayers(supabase: SupabaseClient, requestIds: string[], at = new Date().toISOString()) {
  if (!requestIds.length) return
  markPrayed(requestIds, at)
  const results = await Promise.all(requestIds.map(request_id =>
    supabase.from('prayer_request_prayers').insert({ request_id, prayed_at: at })))
  const failed = results.find(r => r.error && !missing(r.error.message))
  if (failed) console.error('Failed to log prayers', failed.error)
}

// ── Wording ──

// "today", "yesterday", "3 days ago", "2 weeks ago", "5 months ago"
export function sinceLabel(iso: string, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))
  if (days === 0) return trNow('today')
  if (days === 1) return trNow('yesterday')
  if (days < 14) return trNow('{days} {days:day|days} ago', { days })
  if (days < 60) return trNow('{n} {n:week|weeks} ago', { n: Math.floor(days / 7) })
  return trNow('{n} {n:month|months} ago', { n: Math.floor(days / 30) })
}

// How long God's answer took: "the same day", "after 3 days", "after 2 weeks", "after 4 months"
export function answeredAfter(createdAt: string, answeredAt: string) {
  const days = Math.max(0, Math.floor((new Date(answeredAt).getTime() - new Date(createdAt).getTime()) / 86_400_000))
  if (days === 0) return trNow('Answered the same day')
  if (days < 14) return trNow('Answered after {days} {days:day|days}', { days })
  if (days < 60) return trNow('Answered after {n} {n:week|weeks}', { n: Math.floor(days / 7) })
  if (days < 730) return trNow('Answered after {n} {n:month|months}', { n: Math.floor(days / 30) })
  return trNow('Answered after {n} {n:year|years}', { n: Math.floor(days / 365) })
}

// ── Daily prayer reminders ──

export const MAX_REMINDERS = 5
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

// Clean, sorted 'HH:MM' times, five at most, no repeats
export function cleanTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((t): t is string => typeof t === 'string' && TIME.test(t)))].sort().slice(0, MAX_REMINDERS)
}

// The reminder due at `minutes` past local midnight, if any. A run may come a few
// minutes late, so a time counts as due for `grace` minutes after it.
export function dueTime(times: string[], minutes: number, grace = 5) {
  return times.find(t => {
    const [h, m] = t.split(':').map(Number)
    const at = h * 60 + m
    return minutes >= at && minutes < at + grace
  }) ?? null
}

export async function loadReminders(supabase: SupabaseClient, userId: string): Promise<{ times: string[]; ready: boolean }> {
  const { data, error } = await supabase.from('prayer_reminders').select('times').eq('user_id', userId).maybeSingle()
  if (error) return { times: [], ready: !missing(error.message) }
  return { times: cleanTimes(data?.times), ready: true }
}

export async function saveReminders(supabase: SupabaseClient, userId: string, times: string[]) {
  const { error } = await supabase.from('prayer_reminders')
    .upsert({ user_id: userId, times: cleanTimes(times), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
