// Guided prayer sessions: your prayer requests become cards, prayed through one at a time,
// with the chosen minutes shared equally between them. Pure logic plus small storage helpers.

export interface GuidedItem {
  id: string
  title: string
  description: string | null
  category: string
}

export interface GuidedState {
  items: GuidedItem[]
  segments: number[]      // seconds for each item, adding up exactly to the chosen total
  startedAt: number       // epoch ms, moved back when you skip ahead
  pausedAt: number | null // epoch ms while paused
  pausedTotal: number     // ms spent paused so far
  date: string            // the local day the session started (YYYY-MM-DD)
}

// ── The equal split ──

// Whole seconds; any remainder goes to the first items so the parts add up exactly
export function splitSeconds(totalSeconds: number, count: number): number[] {
  const total = Math.floor(totalSeconds)
  if (count <= 0 || total <= 0) return []
  const base = Math.floor(total / count)
  const extra = total - base * count
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0))
}

export const totalSeconds = (segments: number[]) => segments.reduce((a, b) => a + b, 0)

// Where a session should warn that each request gets too little time
export const SHORT_SEGMENT_SECONDS = 15

// "45 seconds", "1 minute", "1 min 30 s", "2 minutes"
export function describeSeconds(sec: number) {
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'}`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (s === 0) return `${m} minute${m === 1 ? '' : 's'}`
  return `${m} min ${s} s`
}

// 05:00 · 00:45 · 1:02:03
export function formatClock(sec: number) {
  const t = Math.max(0, Math.ceil(sec))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ── Running the session ──

export function startGuided(items: GuidedItem[], minutes: number, now: number, date: string): GuidedState {
  return { items, segments: splitSeconds(minutes * 60, items.length), startedAt: now, pausedAt: null, pausedTotal: 0, date }
}

// Time actually spent praying (pauses excluded), in ms
export function elapsedMs(s: GuidedState, now: number) {
  const end = s.pausedAt ?? now
  return Math.max(0, end - s.startedAt - s.pausedTotal)
}

export const segmentStart = (segments: number[], index: number) =>
  segments.slice(0, Math.max(0, index)).reduce((a, b) => a + b, 0)

export interface Position {
  index: number     // which card is showing
  remaining: number // seconds left on this card
  progress: number  // 0..1 through this card
  done: boolean     // every card has had its time
}

export function positionAt(segments: number[], elapsedSeconds: number): Position {
  let acc = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (elapsedSeconds < acc + seg) {
      const inSeg = elapsedSeconds - acc
      return { index: i, remaining: acc + seg - elapsedSeconds, progress: seg ? inSeg / seg : 1, done: false }
    }
    acc += seg
  }
  return { index: Math.max(0, segments.length - 1), remaining: 0, progress: 1, done: true }
}

export function pauseGuided(s: GuidedState, now: number): GuidedState {
  return s.pausedAt ? s : { ...s, pausedAt: now }
}

export function resumeGuided(s: GuidedState, now: number): GuidedState {
  return s.pausedAt ? { ...s, pausedTotal: s.pausedTotal + (now - s.pausedAt), pausedAt: null } : s
}

// Jump to the start of a card (moving past the last one finishes the session)
export function jumpTo(s: GuidedState, index: number, now: number): GuidedState {
  const target = segmentStart(s.segments, Math.min(Math.max(0, index), s.segments.length)) * 1000
  return { ...s, startedAt: s.startedAt - (target - elapsedMs(s, now)) }
}

// Seconds to record: what was actually prayed, never more than planned
export function prayedSeconds(s: GuidedState, now: number) {
  return Math.min(totalSeconds(s.segments), Math.round(elapsedMs(s, now) / 1000))
}

// Too short to count as a prayer session
export const MIN_SAVE_SECONDS = 30

// ── Choosing which requests to pray for (rotation) ──

// Requests you have prayed for least recently come first, never-prayed ones before all,
// so a short session works its way round your whole list over several days.
export function pickForSession<T extends { id: string }>(items: T[], count: number | 'all', lastPrayed: Record<string, string>): T[] {
  const ranked = items
    .map((item, i) => ({ item, i, at: lastPrayed[item.id] ?? '' }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.i - b.i)
    .map(r => r.item)
  return count === 'all' ? ranked : ranked.slice(0, Math.max(0, count))
}

// ── Storage ──

const GUIDED_KEY = 'guided_prayer'      // the running session (this tab only, like the prayer timer)
const LAST_KEY = 'prayer-last-prayed'   // request id -> when it was last prayed for (this device)

export function isGuidedState(v: unknown): v is GuidedState {
  if (!v || typeof v !== 'object') return false
  const s = v as GuidedState
  return Array.isArray(s.items) && s.items.length > 0 &&
    s.items.every(i => i && typeof i.id === 'string' && typeof i.title === 'string') &&
    Array.isArray(s.segments) && s.segments.length === s.items.length &&
    s.segments.every(n => Number.isFinite(n) && n > 0) &&
    Number.isFinite(s.startedAt) && Number.isFinite(s.pausedTotal) &&
    (s.pausedAt === null || Number.isFinite(s.pausedAt)) && typeof s.date === 'string'
}

export function loadGuided(): GuidedState | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(GUIDED_KEY) ?? 'null')
    return isGuidedState(raw) ? raw : null
  } catch {
    return null
  }
}
export function saveGuided(s: GuidedState) {
  try { sessionStorage.setItem(GUIDED_KEY, JSON.stringify(s)) } catch {}
}
export function clearGuided() {
  try { sessionStorage.removeItem(GUIDED_KEY) } catch {}
}
export function guidedRunning() {
  try { return !!sessionStorage.getItem(GUIDED_KEY) } catch { return false }
}
export function classicTimerRunning() {
  try { return !!sessionStorage.getItem('prayer_timer') } catch { return false }
}

export function loadLastPrayed(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}
export function markPrayed(ids: string[], at = new Date().toISOString()) {
  const next = { ...loadLastPrayed() }
  for (const id of ids) next[id] = at
  try { localStorage.setItem(LAST_KEY, JSON.stringify(next)) } catch {}
  return next
}
