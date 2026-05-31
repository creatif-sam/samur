'use client'

import { JSX, useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Play, Pause, Square, Flame, X, Check } from 'lucide-react'
import { toast } from 'sonner'

const PRESETS = [1, 2, 3, 5, 10, 15, 20, 30]

type TimerState = 'idle' | 'running' | 'paused' | 'complete'

interface Inspiration {
  content: string
  savedAt: string
}

interface Props {
  userId: string
  onSessionComplete?: () => void
}

// ── Donut Ring SVG ────────────────────────────────────────────────────────────
function DonutRing({ progress, size = 220 }: { progress: number; size?: number }): JSX.Element {
  const strokeWidth = 18
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const filled = Math.min(1, Math.max(0, progress)) * circumference
  const isComplete = progress >= 1
  const strokeColor = isComplete ? '#22c55e' : '#f59e0b'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s ease, stroke 0.4s ease' }}
      />
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PrayerTimer({ userId, onSessionComplete }: Props): JSX.Element {
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [selectedMinutes, setSelectedMinutes] = useState(5)
  const [customMinutes, setCustomMinutes] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [inspirations, setInspirations] = useState<Inspiration[]>([])
  const [showInspire, setShowInspire] = useState(false)
  const [inspireText, setInspireText] = useState('')
  const [savingInspire, setSavingInspire] = useState(false)
  const [savingSession, setSavingSession] = useState(false)

  // Refs to avoid stale closure in callbacks / effects
  const sessionIdRef = useRef<string | null>(null)
  const inspirationsRef = useRef<Inspiration[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasCompletedRef = useRef(false)
  // Absolute end timestamp — survives tab switches
  const endTimeRef = useRef<number | null>(null)

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Timer control helpers ─────────────────────────────────────────────────
  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetAll = useCallback(() => {
    clearTick()
    endTimeRef.current = null
    sessionStorage.removeItem('prayer_timer')
    setTimerState('idle')
    setSecondsLeft(0)
    setTotalSeconds(0)
    setInspirations([])
    inspirationsRef.current = []
    sessionIdRef.current = null
    hasCompletedRef.current = false
  }, [clearTick])

  const saveSession = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid) return
    const supabase = createClient()
    await supabase
      .from('prayer_sessions')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', sid)
  }, [])

  const handleComplete = useCallback(async () => {
    if (hasCompletedRef.current) return
    hasCompletedRef.current = true
    setSavingSession(true)
    await saveSession()
    setSavingSession(false)
    onSessionComplete?.()
    const count = inspirationsRef.current.length
    toast.success(
      `Prayer complete! 🙏${count > 0 ? ` ${count} inspiration${count > 1 ? 's' : ''} saved ✨` : ''}`
    )
    resetAll()
  }, [saveSession, onSessionComplete, resetAll])

  // ── Tick interval (timestamp-based so tab/app switches don't pause it) ────
  useEffect(() => {
    if (timerState === 'running') {
      const tick = () => {
        if (!endTimeRef.current) return
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
        setSecondsLeft(remaining)
        if (remaining <= 0) {
          clearTick()
          setTimerState('complete')
        }
      }
      tick() // immediate first tick
      intervalRef.current = setInterval(tick, 500)
    }
    return clearTick
  }, [timerState, clearTick])

  // ── Re-sync when tab becomes visible again ────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
        setSecondsLeft(remaining)
        if (remaining <= 0) {
          clearTick()
          setTimerState('complete')
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [clearTick])

  // ── Restore timer state on mount (survives page navigation) ──────────────
  useEffect(() => {
    const saved = sessionStorage.getItem('prayer_timer')
    if (!saved) return
    try {
      const { endTime, totalSeconds: total, sessionId } = JSON.parse(saved)
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      if (remaining > 0) {
        endTimeRef.current = endTime
        sessionIdRef.current = sessionId
        setTotalSeconds(total)
        setSecondsLeft(remaining)
        setTimerState('running')
      } else {
        sessionStorage.removeItem('prayer_timer')
      }
    } catch {
      sessionStorage.removeItem('prayer_timer')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-complete when timer hits 0 ──────────────────────────────────────
  useEffect(() => {
    if (timerState === 'complete') {
      void handleComplete()
    }
  }, [timerState, handleComplete])

  // ── Start timer ───────────────────────────────────────────────────────────
  const startTimer = async () => {
    const mins = customMinutes ? Number(customMinutes) : selectedMinutes
    if (!mins || mins <= 0) return
    hasCompletedRef.current = false
    inspirationsRef.current = []
    const secs = mins * 60
    const endTime = Date.now() + secs * 1000
    endTimeRef.current = endTime
    setTotalSeconds(secs)
    setSecondsLeft(secs)
    setInspirations([])
    sessionStorage.setItem('prayer_timer', JSON.stringify({ endTime, totalSeconds: secs, sessionId: null }))
    setTimerState('running')

    // Create session row in DB
    const supabase = createClient()
    const { data } = await supabase
      .from('prayer_sessions')
      .insert({ user_id: userId, date: new Date().toISOString().slice(0, 10), duration_seconds: secs })
      .select('id')
      .single()
    if (data) {
      sessionIdRef.current = data.id
      // Update sessionStorage with real sessionId
      sessionStorage.setItem('prayer_timer', JSON.stringify({ endTime, totalSeconds: secs, sessionId: data.id }))
    }
  }

  // ── Save inspiration note ─────────────────────────────────────────────────
  const saveInspiration = async () => {
    const text = inspireText.trim()
    if (!text) return
    setSavingInspire(true)
    const supabase = createClient()
    const sid = sessionIdRef.current

    // 1. Save to prayer_inspirations
    let inspirationId: string | undefined
    if (sid) {
      const { data } = await supabase
        .from('prayer_inspirations')
        .insert({ session_id: sid, user_id: userId, content: text })
        .select('id')
        .single()
      inspirationId = data?.id
    }

    // 2. Save to Notes: "Prayer Inspirations" notebook
    try {
      let { data: nb } = await supabase
        .from('notebooks')
        .select('id')
        .eq('user_id', userId)
        .eq('title', 'Prayer Inspirations')
        .maybeSingle()

      if (!nb) {
        const { data: created } = await supabase
          .from('notebooks')
          .insert({ user_id: userId, title: 'Prayer Inspirations', emoji: '🙏', color: '#7c3aed' })
          .select('id')
          .single()
        nb = created
      }

      if (nb) {
        const dateLabel = new Date().toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        let { data: sec } = await supabase
          .from('sections')
          .select('id')
          .eq('notebook_id', nb.id)
          .eq('title', dateLabel)
          .maybeSingle()

        if (!sec) {
          const { data: cs } = await supabase
            .from('sections')
            .insert({ notebook_id: nb.id, title: dateLabel })
            .select('id')
            .single()
          sec = cs
        }

        if (sec) {
          const timeLabel = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          const { data: pg } = await supabase
            .from('pages')
            .insert({
              section_id: sec.id,
              title: `Inspiration — ${timeLabel}`,
              content: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
            })
            .select('id')
            .single()

          if (pg && inspirationId) {
            await supabase.from('prayer_inspirations').update({ page_id: pg.id }).eq('id', inspirationId)
          }
        }
      }
    } catch {
      // Non-blocking — notes sync failure is not fatal
    }

    const entry: Inspiration = {
      content: text,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    inspirationsRef.current = [...inspirationsRef.current, entry]
    setInspirations(prev => [...prev, entry])
    setInspireText('')
    setSavingInspire(false)
    setShowInspire(false)
    toast.success('Inspiration saved to Notes ✨')
  }

  // ── Idle UI: duration picker ───────────────────────────────────────────────
  if (timerState === 'idle') {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-violet-950/90 to-indigo-950/80 border border-violet-700/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h3 className="font-black text-white uppercase tracking-tight text-sm">Prayer Timer</h3>
        </div>
        <p className="text-violet-300 text-xs font-medium">Set your prayer duration then press Start</p>

        {/* Preset minutes */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(min => (
            <button
              key={min}
              onClick={() => { setSelectedMinutes(min); setCustomMinutes('') }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedMinutes === min && !customMinutes
                  ? 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {min}m
            </button>
          ))}
        </div>

        {/* Custom + Start row */}
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="180"
            placeholder="Custom minutes"
            value={customMinutes}
            onChange={e => { setCustomMinutes(e.target.value); setSelectedMinutes(0) }}
            className="flex-1 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-violet-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={startTimer}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/30"
          >
            <Play className="w-4 h-4" /> Start
          </button>
        </div>
      </div>
    )
  }

  // ── Active / complete UI: donut ring ──────────────────────────────────────
  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-violet-950/90 to-indigo-950/80 border border-violet-700/30 p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="font-black text-white text-sm uppercase tracking-tight">In Prayer</span>
          </div>
          <div className="flex items-center gap-3">
            {savingSession && (
              <span className="text-[10px] font-bold text-violet-300 animate-pulse uppercase tracking-widest">Saving…</span>
            )}
            {inspirations.length > 0 && (
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                {inspirations.length} ✨
              </span>
            )}
          </div>
        </div>

        {/* Donut ring with overlay */}
        <div className="relative flex items-center justify-center py-2">
          <DonutRing progress={progress} size={224} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-5xl font-black text-white tabular-nums leading-none tracking-tight drop-shadow-lg">
              {fmt(secondsLeft)}
            </span>
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mt-1">
              {timerState === 'paused' ? '⏸ Paused' : 'remaining'}
            </span>

            {/* Plus button — capture inspiration */}
            <button
              onClick={() => setShowInspire(true)}
              className="mt-3 w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center justify-center shadow-2xl shadow-amber-500/50 active:scale-90 transition-all"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex gap-2 justify-center">
          {timerState === 'running' ? (
            <button
              onClick={() => {
                clearTick()
                endTimeRef.current = null
                sessionStorage.removeItem('prayer_timer')
                setTimerState('paused')
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button
              onClick={() => {
                const endTime = Date.now() + secondsLeft * 1000
                endTimeRef.current = endTime
                sessionStorage.setItem('prayer_timer', JSON.stringify({ endTime, totalSeconds, sessionId: sessionIdRef.current }))
                setTimerState('running')
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm transition"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 font-bold text-sm transition"
          >
            <Square className="w-4 h-4" /> Stop
          </button>
          <button
            onClick={handleComplete}
            disabled={savingSession}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold text-sm transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Done
          </button>
        </div>

        {/* Inspirations captured during this session */}
        {inspirations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest px-1">
              Inspirations this session
            </p>
            <div className="max-h-44 overflow-y-auto space-y-2">
              {inspirations.map((ins, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white/90 leading-relaxed"
                >
                  <span className="text-[10px] text-amber-300 font-bold mr-2">{ins.savedAt}</span>
                  {ins.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inspiration capture bottom sheet */}
      {showInspire && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card dark:bg-zinc-950 rounded-t-[36px] border-t border-border p-6 pb-10 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h4 className="font-black text-foreground uppercase tracking-tight">Capture Inspiration</h4>
              </div>
              <button
                onClick={() => setShowInspire(false)}
                className="p-1.5 rounded-full hover:bg-muted transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <textarea
              autoFocus
              placeholder="What is God speaking to you right now?"
              value={inspireText}
              onChange={e => setInspireText(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-[10px] text-muted-foreground">
              Saved to your <strong>Prayer Inspirations</strong> notebook in Notes
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowInspire(false)}
                className="flex-1 py-2.5 rounded-2xl border text-sm font-medium hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={saveInspiration}
                disabled={savingInspire || !inspireText.trim()}
                className="flex-1 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-50"
              >
                {savingInspire ? 'Saving…' : 'Save Inspiration ✨'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
