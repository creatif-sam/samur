import { addDays } from '@/lib/dates'
import { taskSpan, type PlannerTask } from '@/lib/planner/tasks'

// A week of your events as a calendar file (.ics) for Google, Apple or Outlook Calendar.
// Times are "floating": the calendar shows them at the same clock time wherever you are,
// as the planner does. Each repeat is its own event, so the file is a snapshot of the week.

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (day: string, minutes: number) => {
  const d = addDays(day, Math.floor(minutes / 1440))
  const m = minutes % 1440
  return `${d.replace(/-/g, '')}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`
}
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines longer than 75 bytes are folded (RFC 5545), without splitting a character
function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function weekToIcs(
  days: { day: string; tasks: Pick<PlannerTask, 'id' | 'text' | 'start' | 'end' | 'owner_id'>[] }[],
  userId: string | null,
  opts: { calendarName: string; now?: Date } ,
) {
  const now = opts.now ?? new Date()
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mastery//Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escape(opts.calendarName)}`]
  for (const d of days) {
    for (const t of d.tasks) {
      if (t.owner_id && t.owner_id !== userId) continue
      const span = taskSpan(t)
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}-${d.day}@mastery`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${stamp(d.day, span.start)}`,
        `DTEND:${stamp(d.day, span.end)}`,
        `SUMMARY:${escape(t.text)}`,
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
