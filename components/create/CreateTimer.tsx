'use client'

import { useEffect, useState } from 'react'
import { History, Play, Square, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatElapsed } from '@/lib/create'

// Counts up from the start time, so a sleeping tab never loses time
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <p className="font-mono text-5xl font-bold tabular-nums tracking-tight" aria-live="off">
      {formatElapsed(now === null ? 0 : now - startedAt)}
    </p>
  )
}

interface Props {
  running: { startedAt: number; activity: string } | null
  recent: string[]
  onStart: () => void
  onActivity: (text: string) => void
  onStop: () => void
  onDiscard: () => void
  onLogPast: () => void
  // True while the form is open, so the start button waits
  busy: boolean
}

export default function CreateTimer({ running, recent, onStart, onActivity, onStop, onDiscard, onLogPast, busy }: Props) {
  if (running) {
    return (
      <section className="rounded-3xl border border-emerald-500/30 bg-emerald-50 p-5 dark:bg-emerald-500/10">
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">In session</span>
        </div>

        <Elapsed startedAt={running.startedAt} />
        <p className="mt-1 text-xs text-muted-foreground">
          Started {new Date(running.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Keeps running if you leave this page.
        </p>

        <div className="mt-4 space-y-2">
          <Input
            value={running.activity}
            onChange={e => onActivity(e.target.value)}
            placeholder="What are you working on?"
            className="h-11 bg-background"
          />
          {recent.length > 0 && !running.activity && (
            <div className="flex flex-wrap gap-1.5">
              {recent.slice(0, 4).map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onActivity(name)}
                  className="max-w-full truncate rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 ring-1 ring-border active:scale-95"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onStop}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition active:scale-[0.98]"
          >
            <Square className="h-4 w-4 fill-current" /> Stop and save
          </button>
          <button
            type="button"
            onClick={onDiscard}
            aria-label="Discard this session"
            className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-muted-foreground ring-1 ring-border transition active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-violet-600 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition active:scale-[0.98] disabled:opacity-50"
      >
        <Play className="h-5 w-5 fill-current" /> Start a session
      </button>
      <button
        type="button"
        onClick={onLogPast}
        disabled={busy}
        className="mx-auto mt-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
      >
        <History className="h-4 w-4" /> Or log a past session
      </button>
    </section>
  )
}
