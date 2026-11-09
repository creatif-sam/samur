'use client'

import { useMemo, useState } from 'react'
import { Check, Play, X } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import { cn } from '@/lib/utils'
import { toLocalDateKey } from '@/lib/dates'
import { useVisualViewport } from '@/lib/useVisualViewport'
import { unlockChime } from '@/lib/prayer/chime'
import {
  describeSeconds, loadLastPrayed, pickForSession, SHORT_SEGMENT_SECONDS, splitSeconds, startGuided,
  type GuidedItem, type GuidedState,
} from '@/lib/prayer/session'

const MINUTE_CHOICES = [1, 2, 3, 5, 10, 15, 20, 30]

interface Props {
  requests: GuidedItem[]          // active prayer requests, newest first
  initialTopicId?: string | null  // opened from "Pray for this" on a request
  blockedReason?: string | null   // e.g. the prayer timer is already running
  onStart: (state: GuidedState) => void
  onClose: () => void
}

export default function GuidedPrayerSetup({ requests, initialTopicId, blockedReason, onStart, onClose }: Props) {
  const [mode, setMode] = useState<'all' | 'one'>(initialTopicId ? 'one' : 'all')
  const [included, setIncluded] = useState<Set<string>>(() => new Set(requests.map(r => r.id)))
  const [count, setCount] = useState<number | 'all'>('all')
  const [topicId, setTopicId] = useState<string>(initialTopicId ?? requests[0]?.id ?? '')
  const [minutes, setMinutes] = useState(5)
  const [custom, setCustom] = useState('')
  const visible = useVisualViewport()
  const fit = visible?.keyboardOpen ? visible : null

  const chosenMinutes = custom ? Number(custom) : minutes
  const minutesValid = Number.isFinite(chosenMinutes) && chosenMinutes >= 1 && chosenMinutes <= 180

  const selected = useMemo(() => requests.filter(r => included.has(r.id)), [requests, included])
  const countChoices = [3, 5, 7].filter(n => n < selected.length)
  const effectiveCount = count !== 'all' && count >= selected.length ? 'all' : count

  // What this session will pray through, in order
  const items: GuidedItem[] = useMemo(() => {
    if (mode === 'one') return requests.filter(r => r.id === topicId)
    return pickForSession(selected, effectiveCount, loadLastPrayed())
  }, [mode, requests, topicId, selected, effectiveCount])

  const split = minutesValid ? splitSeconds(chosenMinutes * 60, items.length) : []
  const perItem = split.length ? Math.min(...split) : 0
  const tooShort = items.length > 1 && perItem > 0 && perItem < SHORT_SEGMENT_SECONDS
  const canStart = items.length > 0 && minutesValid && !blockedReason

  const toggle = (id: string) =>
    setIncluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const start = () => {
    if (!canStart) return
    unlockChime() // inside the tap, so the between-request chime may play on iPhone
    onStart(startGuided(items, chosenMinutes, Date.now(), toLocalDateKey(new Date())))
  }

  const chip = (on: boolean) =>
    cn('rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95', on ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground')

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      style={fit ? { top: fit.offsetTop, height: fit.height, bottom: 'auto' } : undefined}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Start a prayer session"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-background p-5 pb-8 shadow-2xl sm:rounded-[32px]"
        style={{ maxHeight: fit ? fit.height : '90dvh', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-0.5">
              <h3 className="text-lg font-black tracking-tight">Prayer session</h3>
              <HelpTip topic="prayer.guided" align="left" className="-my-1" />
            </div>
            <p className="text-xs text-muted-foreground">One card at a time, with your minutes shared equally.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add a prayer request first, then you can pray through them here.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1">
              {([['all', 'My requests'], ['one', 'One topic']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn('rounded-xl py-2 text-xs font-bold transition', mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'all' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Include</p>
                  <button
                    onClick={() => setIncluded(included.size === requests.length ? new Set() : new Set(requests.map(r => r.id)))}
                    className="text-[11px] font-bold text-violet-600 dark:text-violet-400"
                  >
                    {included.size === requests.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {requests.map(r => {
                    const on = included.has(r.id)
                    return (
                      <li key={r.id}>
                        <button
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(r.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/50"
                        >
                          <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border-2', on ? 'border-violet-600 bg-violet-600 text-white' : 'border-muted-foreground/40')}>
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span className="truncate text-sm font-semibold">{r.title}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {countChoices.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">How many this time</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setCount('all')} className={chip(effectiveCount === 'all')}>All {selected.length}</button>
                      {countChoices.map(n => (
                        <button key={n} onClick={() => setCount(n)} className={chip(effectiveCount === n)}>{n}</button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Starts with the ones you prayed for least recently, so every request comes round.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Choose a topic</p>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {requests.map(r => (
                    <li key={r.id}>
                      <button
                        role="radio"
                        aria-checked={topicId === r.id}
                        onClick={() => setTopicId(r.id)}
                        className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition', topicId === r.id ? 'bg-violet-50 ring-1 ring-violet-500 dark:bg-violet-500/10' : 'hover:bg-muted/50')}
                      >
                        <span className={cn('h-4 w-4 shrink-0 rounded-full border-2', topicId === r.id ? 'border-[5px] border-violet-600' : 'border-muted-foreground/40')} />
                        <span className="truncate text-sm font-semibold">{r.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Minutes</p>
              <div className="flex flex-wrap gap-1.5">
                {MINUTE_CHOICES.map(m => (
                  <button key={m} onClick={() => { setMinutes(m); setCustom('') }} className={chip(!custom && minutes === m)}>{m}</button>
                ))}
                <input
                  inputMode="numeric"
                  value={custom}
                  onChange={e => setCustom(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                  placeholder="Other"
                  aria-label="Other number of minutes"
                  className={cn('h-8 w-20 rounded-full bg-muted px-3 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500', custom && 'bg-violet-600 text-white placeholder:text-white/70')}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-violet-50 px-4 py-3 dark:bg-violet-500/10">
              {items.length === 0 ? (
                <p className="text-sm font-semibold text-muted-foreground">Choose at least one request.</p>
              ) : !minutesValid ? (
                <p className="text-sm font-semibold text-muted-foreground">Choose between 1 and 180 minutes.</p>
              ) : mode === 'one' || items.length === 1 ? (
                <p className="text-sm font-bold text-violet-900 dark:text-violet-200">
                  {describeSeconds(chosenMinutes * 60)} for “{items[0].title}”
                </p>
              ) : (
                <p className="text-sm font-bold text-violet-900 dark:text-violet-200">
                  {items.length} requests · {describeSeconds(perItem)}{split.some(s => s !== perItem) ? ' or a little more' : ''} each
                </p>
              )}
              {tooShort && (
                <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  That is very little time each. Choose more minutes or fewer requests.
                </p>
              )}
            </div>

            {blockedReason && <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{blockedReason}</p>}

            <button
              onClick={start}
              disabled={!canStart}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition active:scale-[0.98] disabled:opacity-40"
            >
              <Play className="h-4 w-4 fill-current" /> Start praying
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
