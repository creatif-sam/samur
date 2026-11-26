'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { ArrowRight, Check } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'

// Closing the day in the evening card: a short checklist of what is left
// (unfinished events, unfinished Top 3, the reflection), each with its one-tap action.
export default function DayWrapUp({ unfinishedEvents, onMoveEvents, top3Total, top3Open, top3Carried, onCarryTop3, reflectionDone, tomorrowLabel, busy }: {
  unfinishedEvents: number
  onMoveEvents: () => void
  top3Total: number
  top3Open: number
  top3Carried: boolean
  onCarryTop3: () => void
  reflectionDone: boolean
  tomorrowLabel: string
  busy?: boolean
}) {
  const { tr } = useTranslation()
  const rows: { done: boolean; text: string; action?: { label: string; onClick: () => void } }[] = [
    unfinishedEvents === 0
      ? { done: true, text: tr('Every event is done or moved') }
      : {
          done: false,
          text: tr('{n} unfinished {n:event|events}', { n: unfinishedEvents }),
          action: { label: tr('Move to {day}', { day: tomorrowLabel }), onClick: onMoveEvents },
        },
  ]
  if (top3Total > 0) {
    rows.push(top3Open === 0 || top3Carried
      ? { done: true, text: top3Carried ? tr('Top 3 carried to {day}', { day: tomorrowLabel }) : tr('Top 3 all done') }
      : {
          done: false,
          text: tr('{n} of your Top 3 not done', { n: top3Open }),
          action: { label: tr('Carry to {day}', { day: tomorrowLabel }), onClick: onCarryTop3 },
        })
  }
  rows.push(reflectionDone
    ? { done: true, text: tr('Reflection written') }
    : { done: false, text: tr('Write a line about your day above') })

  const allDone = rows.every(r => r.done)
  return (
    <div className="mt-3 border-t border-white/20 pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {allDone ? tr('Day closed ✓') : tr('Close the day')}
        </span>
        <HelpTip topic="planner.wrapup" tone="onDark" align="left" className="-my-1" />
      </div>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.text} className="flex items-center gap-2.5">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${r.done ? 'border-white bg-white' : 'border-white/50'}`}>
              {r.done && <Check className="h-3 w-3 stroke-[3] text-indigo-700" />}
            </span>
            <span className={`min-w-0 flex-1 text-[13px] font-semibold ${r.done ? 'text-white/60' : 'text-white'}`}>{r.text}</span>
            {r.action && (
              <button
                onClick={r.action.onClick}
                disabled={busy}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-white/20 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {r.action.label} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
