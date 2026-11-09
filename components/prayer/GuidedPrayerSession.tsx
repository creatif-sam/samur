'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { chimeMuted, playChime, setChimeMuted } from '@/lib/prayer/chime'
import {
  clearGuided, elapsedMs, formatClock, jumpTo, markPrayed, MIN_SAVE_SECONDS, pauseGuided, positionAt, prayedSeconds,
  resumeGuided, totalSeconds, type GuidedItem, type GuidedState,
} from '@/lib/prayer/session'

const CATEGORY_LABEL: Record<string, string> = {
  personal: 'Personal', family: 'Family', intercession: 'Intercession',
  guidance: 'Guidance', healing: 'Healing', thanksgiving: 'Thanksgiving',
}

interface Props {
  state: GuidedState
  userId: string
  onState: (next: GuidedState) => void
  onSaved: () => void                         // refresh the calendar and graph
  onAddToDiary: (prayed: GuidedItem[]) => void
  onClose: () => void
}

type Phase = 'praying' | 'saving' | 'summary'

type WakeLockNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }

export default function GuidedPrayerSession({ state, userId, onState, onSaved, onAddToDiary, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [phase, setPhase] = useState<Phase>('praying')
  const [muted, setMuted] = useState(false)
  const [result, setResult] = useState<{ seconds: number; prayed: GuidedItem[]; saved: boolean } | null>(null)
  const finishing = useRef(false)

  useEffect(() => { setMuted(chimeMuted()) }, [])

  const paused = state.pausedAt !== null
  const pos = positionAt(state.segments, elapsedMs(state, now) / 1000)
  const item = state.items[pos.index]
  const total = totalSeconds(state.segments)
  const left = Math.max(0, total - elapsedMs(state, now) / 1000)

  // Tick from the clock, so time spent with the app in the background still counts
  useEffect(() => {
    if (phase !== 'praying' || paused) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [phase, paused])

  // Keep the screen awake while praying (asked again when you come back to the app)
  useEffect(() => {
    if (phase !== 'praying') return
    let lock: { release: () => Promise<void> } | null = null
    const request = async () => {
      try {
        const nav = navigator as WakeLockNav
        if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen')
      } catch {}
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [phase])

  // A soft chime when the next card comes up
  const shownIndex = useRef(pos.index)
  useEffect(() => {
    if (pos.index !== shownIndex.current) {
      shownIndex.current = pos.index
      if (!pos.done) playChime()
    }
  }, [pos.index, pos.done])

  // The requests reached so far (the current one counts once half its time is spent)
  const reached = useCallback((p: typeof pos, all: boolean) =>
    all ? state.items : state.items.slice(0, p.index + (p.progress >= 0.5 ? 1 : 0)), [state.items])

  const finish = useCallback(async (all: boolean) => {
    if (finishing.current) return
    const end = Date.now()
    const seconds = all ? total : prayedSeconds(state, end)
    const p = positionAt(state.segments, elapsedMs(state, end) / 1000)
    const prayed = reached(p, all)
    if (seconds < MIN_SAVE_SECONDS) {
      if (!window.confirm('End now? Sessions under 30 seconds are not saved.')) return
      finishing.current = true
      onClose()
      return
    }
    finishing.current = true
    // Forget the running session first, so a reload on the summary cannot save it twice
    clearGuided()
    setPhase('saving')
    const { error } = await createClient().from('prayer_sessions').insert({
      user_id: userId,
      date: state.date,
      duration_seconds: seconds,
      completed: true,
      completed_at: new Date(end).toISOString(),
    })
    if (!error) {
      if (prayed.length) markPrayed(prayed.map(i => i.id))
      onSaved()
      // Same partner note as the prayer timer (the server sends it once a day)
      fetch('/api/prayer/partner-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: state.date }),
      }).catch(() => {})
    } else {
      toast.error("Couldn't save this session to your calendar.")
    }
    playChime()
    setResult({ seconds, prayed, saved: !error })
    setPhase('summary')
  }, [state, total, userId, reached, onSaved, onClose])

  // Every card has had its time
  useEffect(() => {
    if (phase === 'praying' && pos.done) void finish(true)
  }, [phase, pos.done, finish])

  const togglePause = () => {
    const t = Date.now()
    onState(paused ? resumeGuided(state, t) : pauseGuided(state, t))
    setNow(t)
  }
  const go = (index: number) => {
    const t = Date.now()
    onState(jumpTo(state, index, t))
    setNow(t)
  }
  const toggleMute = () => {
    setChimeMuted(!muted)
    setMuted(!muted)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-gradient-to-b from-[#24123f] via-[#170c2b] to-[#0b0716] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-label="Prayer session"
    >
      {phase !== 'summary' ? (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                Card {pos.index + 1} of {state.items.length}
              </p>
              <p className="text-xs font-semibold text-white/60 tabular-nums">{formatClock(left)} left in all</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleMute} aria-label={muted ? 'Turn the chime on' : 'Turn the chime off'} className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/10">
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button onClick={() => void finish(false)} aria-label="End session" className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* One bar per card */}
          <div className="mt-3 flex gap-1 px-4">
            {state.segments.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-amber-300 transition-[width] duration-500"
                  style={{ width: `${i < pos.index ? 100 : i === pos.index ? Math.round(pos.progress * 100) : 0}%` }}
                />
              </div>
            ))}
          </div>

          {/* The card */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div key={pos.index} className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-500">
              {item.category && (
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-violet-200">
                  {CATEGORY_LABEL[item.category] ?? item.category}
                </span>
              )}
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight">{item.title}</h2>
              {item.description && <p className="mx-auto mt-3 max-w-sm whitespace-pre-wrap text-sm leading-relaxed text-white/75">{item.description}</p>}
            </div>

            <p className="mt-10 font-mono text-6xl font-bold tabular-nums tracking-tight">{formatClock(pos.remaining)}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/50">{paused ? 'Paused' : 'for this request'}</p>

            {pos.index + 1 < state.items.length && (
              <p className="mt-6 max-w-xs truncate text-xs text-white/50">Up next: {state.items[pos.index + 1].title}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5 px-6 pb-8">
            <button onClick={() => go(pos.index - 1 < 0 ? 0 : pos.index - 1)} aria-label="Previous request" className="grid h-14 w-14 place-items-center rounded-full bg-white/10 transition active:scale-90">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={togglePause}
              disabled={phase === 'saving'}
              aria-label={paused ? 'Resume' : 'Pause'}
              className="grid h-20 w-20 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-2xl shadow-amber-500/30 transition active:scale-90 disabled:opacity-50"
            >
              {paused ? <Play className="h-8 w-8 fill-current" /> : <Pause className="h-8 w-8 fill-current" />}
            </button>
            <button onClick={() => go(pos.index + 1)} aria-label="Next request" className="grid h-14 w-14 place-items-center rounded-full bg-white/10 transition active:scale-90">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          {phase === 'saving' && <p className="pb-6 text-center text-xs font-bold uppercase tracking-widest text-violet-300">Saving…</p>}
        </>
      ) : (
        result && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-5xl">🙏</p>
            <h2 className="mt-4 font-serif text-4xl font-bold">Amen</h2>
            <p className="mt-2 text-sm text-white/75">
              {result.prayed.length
                ? `You prayed for ${result.prayed.length} request${result.prayed.length === 1 ? '' : 's'} · ${formatClock(result.seconds)}`
                : `You prayed for ${formatClock(result.seconds)}`}
            </p>
            <p className={cn('mt-1 text-xs font-semibold', result.saved ? 'text-emerald-300' : 'text-amber-300')}>
              {result.saved ? 'Saved to your prayer calendar' : 'Not saved to your calendar'}
            </p>
            {result.prayed.length > 0 && (
              <ul className="mt-6 w-full max-w-sm space-y-1.5 text-left">
                {result.prayed.map(i => (
                  <li key={i.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-emerald-300" /> <span className="truncate">{i.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
              {result.prayed.length > 0 && (
                <button onClick={() => onAddToDiary(result.prayed)} className="h-12 rounded-2xl bg-white/10 text-sm font-bold transition active:scale-[0.98]">
                  Add to Prayer Diary
                </button>
              )}
              <button onClick={onClose} className="h-12 rounded-2xl bg-amber-300 text-sm font-bold text-amber-950 transition active:scale-[0.98]">
                Done
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
