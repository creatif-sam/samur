'use client'

import { useState } from 'react'
import { Modal } from './tasks/Modal'
import type { PlannerTask } from './DailyPlanner'
import { taskSpan } from '@/lib/planner/tasks'
import { toLocalDateKey } from '@/lib/dates'

const HOURS_START = 5
const HOURS_END = 23
const ROUND_TO = 15 // Today's free time starts at the next quarter hour
const MIN_BLOCK = 15 // Skip gaps too short to offer

interface FreeBlock {
  start: number
  end: number
}

interface Props {
  tasks: PlannerTask[]
  date: Date
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function FreeTimeExportButton({
  tasks,
  date,
}: Props) {
  const [freeBlocks, setFreeBlocks] = useState<FreeBlock[] | null>(null)

  function calculateFreeTime() {
    const busy = tasks.map(taskSpan).sort((a, b) => a.start - b.start)

    // Today: only from now on. Past days have nothing left to offer.
    const now = new Date()
    const dayKey = toLocalDateKey(date)
    const todayKey = toLocalDateKey(now)
    let cursor = HOURS_START * 60
    if (dayKey === todayKey) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      cursor = Math.max(cursor, Math.ceil(nowMinutes / ROUND_TO) * ROUND_TO)
    } else if (dayKey < todayKey) {
      cursor = HOURS_END * 60
    }
    const end = HOURS_END * 60
    const free: FreeBlock[] = []

    for (const b of busy) {
      if (b.start > cursor) {
        free.push({ start: cursor, end: Math.min(b.start, end) })
      }
      cursor = Math.max(cursor, b.end)
      if (cursor >= end) break
    }

    if (cursor < end) {
      free.push({ start: cursor, end })
    }

    setFreeBlocks(free.filter(f => f.end - f.start >= MIN_BLOCK))
  }

  const isToday = toLocalDateKey(date) === toLocalDateKey(new Date())
  const title = isToday
    ? 'My Free Time Today'
    : `My Free Time on ${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`

  const message =
    freeBlocks &&
    (freeBlocks.length === 0
      ? `💜 *${title}*\n\n` +
        `I'm fully booked${isToday ? ' for the rest of the day' : ''}. Let's find another time 🙏`
      : `💜 *${title}* (${date.toDateString()})\n\n` +
        `⏰ Here are the times I am available${isToday ? ' for the rest of the day' : ''}:\n\n` +
        freeBlocks
          .map(
            (f) =>
              `• ${formatMinutes(f.start)} – ${formatMinutes(f.end)}`
          )
          .join('\n') +
        `\n\n👉 Please pick a time that works best for you.`)

  async function handleNativeShare() {
    if (!message) return
    if (navigator.share) {
      try {
        await navigator.share({ text: message })
      } catch {
        // user dismissed the sheet — do nothing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(message)
    }
    setFreeBlocks(null)
  }

  return (
    <>
      <button
        onClick={calculateFreeTime}
        className="flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white px-5 py-2.5 text-sm font-semibold shadow-md shadow-violet-500/30 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share Free Time
      </button>

      {freeBlocks && message && (
        <Modal onClose={() => setFreeBlocks(null)}>
          <h3 className="font-semibold mb-3">Share Your Free Time</h3>

          <pre className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-3 mb-4">
            {message}
          </pre>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>

            <button
              onClick={() => setFreeBlocks(null)}
              className="px-4 py-2 rounded-xl border text-sm"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
