import { addDays } from '@/lib/dates'
import { formatMinutes } from '@/lib/planner/tasks'

// One-line event entry, in English or French:
//   "Gym 18:00 1h", "Call mum tomorrow 8pm", "Réunion demain 9h-10h30", "Sieste 30 min", "Lire à 7h pendant 45m".
// A time gives the start; a range gives start and end; a duration sets the length (default 1 hour).
// With no time at all, `start` is null and the caller picks the next free slot.

export interface QuickAddResult {
  text: string
  day: string            // YYYY-MM-DD
  start: string | null   // 'HH:MM', or null when no time was given
  end: string | null
  duration: number       // minutes
}

export const DEFAULT_DURATION = 60

// Whole words only (so "after-tomorrow" stays in the title); longer phrases first
const DAY_WORDS: [RegExp, number][] = [
  [/(?:^|\s)apr[eè]s[- ]demain(?=\s|$)/i, 2],
  [/(?:^|\s)day after tomorrow(?=\s|$)/i, 2],
  [/(?:^|\s)(?:tomorrow|tmrw|tmr)(?=\s|$)/i, 1],
  [/(?:^|\s)demain(?=\s|$)/i, 1],
  [/(?:^|\s)(?:today|tonight)(?=\s|$)/i, 0],
  [/(?:^|\s)(?:aujourd['’]hui|ce soir)(?=\s|$)/i, 0],
]

// "6pm", "6:30pm", "18:00", "18h", "18h30", "18.30"
const TIME = String.raw`(\d{1,2})(?:(?::|h|\.)(\d{2})|(h))?\s*(am|pm)?`
const toMinutes = (h: string, m: string | undefined, ampm: string | undefined) => {
  let hour = Number(h)
  const min = m ? Number(m) : 0
  if (ampm) {
    const pm = ampm.toLowerCase() === 'pm'
    if (hour === 12) hour = pm ? 12 : 0
    else if (pm) hour += 12
  }
  if (hour > 23 || min > 59) return null
  return hour * 60 + min
}

// With no day word the event goes on `defaultDay` (the day on screen), else relative to today
export function parseQuickAdd(input: string, todayKey: string, defaultDay = todayKey): QuickAddResult | null {
  let rest = ` ${input.trim()} `
  if (!rest.trim()) return null

  // Day
  let offset: number | null = null
  for (const [re, days] of DAY_WORDS) {
    if (re.test(rest)) { offset = days; rest = rest.replace(re, ' '); break }
  }

  let start: number | null = null
  let end: number | null = null
  let duration: number | null = null

  // Range: "9-10", "9h-10h30", "18:00 – 19:30", "9am to 11am", "de 9h à 10h"
  // (JavaScript's \b treats "à" as a non-letter, so French words are matched with spaces)
  const range = new RegExp(String.raw`(?:(?:^|\s)(?:from|de)\s+)?(?<![\d:])\b${TIME}(?:\s*[-–—]\s*|\s+(?:to|à|jusqu['’]?à)\s+)${TIME}(?=\s|$|[,.;])`, 'i')
  const r = rest.match(range)
  if (r) {
    const ampm2 = r[8]
    const a = toMinutes(r[1], r[2], r[4] ?? ampm2)
    const b = toMinutes(r[5], r[6], ampm2)
    if (a !== null && b !== null) {
      start = a; end = b
      rest = rest.replace(r[0], ' ')
    }
  }

  // Durations with explicit units: "45m", "30 min", "90 minutes", "2 hours", "1.5h"
  const durMin = rest.match(/(?:\b(?:for|pendant)\s+)?\b(\d{1,3})\s*(?:m|min|mins|minutes?)\b/i)
  if (durMin) { duration = Number(durMin[1]); rest = rest.replace(durMin[0], ' ') }
  const durHours = rest.match(/(?:\b(?:for|pendant)\s+)?\b(\d{1,2}(?:[.,]5)?)\s*(?:hours?|hrs?|heures?)\b/i)
  if (durHours && duration === null) { duration = Math.round(Number(durHours[1].replace(',', '.')) * 60); rest = rest.replace(durHours[0], ' ') }

  if (start === null) {
    // Single times. "at"/"à"/"vers" always means a time; otherwise "Nh" below 5 reads as a length
    const timeRe = new RegExp(String.raw`(?:(?:^|\s)(at|à|vers|@)\s*)?(?<![\d:])\b${TIME}(?=\s|$|[,.;])`, 'gi')
    for (const m of [...rest.matchAll(timeRe)]) {
      const [whole, prep, h, mm, hOnly, ampm] = m
      const hasColon = /:|\./.test(whole) && !!mm
      const isHForm = !!hOnly || (/h/i.test(whole) && !!mm && !hasColon)
      const n = Number(h)
      if (!prep && !ampm && !hasColon && !isHForm) continue       // a bare number: leave it in the title
      const looksLikeLength = !prep && !ampm && isHForm && (start !== null || n < 5)
      if (looksLikeLength) {
        if (duration === null) { duration = n * 60 + (mm ? Number(mm) : 0); rest = rest.replace(whole, ' ') }
        continue
      }
      if (start === null) {
        const t = toMinutes(h, mm, ampm)
        if (t !== null) { start = t; rest = rest.replace(whole, ' ') }
      }
    }
  }

  const text = rest.replace(/\s+(?:at|à|on|le|pour|for|pendant)\s*$/i, ' ').replace(/\s{2,}/g, ' ').trim()
  if (!text) return null
  const len = end !== null && start !== null ? ((end - start + 1440) % 1440 || 1440) : duration ?? DEFAULT_DURATION
  return {
    text,
    day: offset === null ? defaultDay : addDays(todayKey, offset),
    start: start === null ? null : formatMinutes(start),
    end: start === null ? null : formatMinutes((start + len) % 1440),
    duration: len,
  }
}
