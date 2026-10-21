'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BookMarked, Check, Loader2, Pencil, Target } from 'lucide-react'
import { addDays, toLocalDateKey } from '@/lib/dates'
import { logReadingPages, type Reading } from '@/lib/readapp/reading'

interface Props {
  readings: Reading[]
  onLogged: () => void
}

function QuickLog({ book, onLogged }: { book: Reading; onLogged: () => void }): JSX.Element {
  const [pages, setPages] = useState('')
  const [saving, setSaving] = useState(false)
  const read = book.total_pages - book.pages_remaining
  const pct = book.total_pages > 0 ? Math.round((read / book.total_pages) * 100) : 0

  async function log() {
    const value = Number(pages)
    if (!value || value <= 0) return
    if (value > book.pages_remaining) {
      toast.error(`Only ${book.pages_remaining} pages left`)
      return
    }
    setSaving(true)
    try {
      const next = await logReadingPages(createClient(), book, value, null)
      setPages('')
      toast.success(next === 'done' ? `Finished ${book.title}! 🎉` : `Logged ${value} pages 📚`)
      onLogged()
    } catch (err) {
      console.error('Quick log failed', err)
      toast.error('Failed to log reading')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-black truncate">{book.title}</p>
        <span className="text-[10px] font-bold text-muted-foreground shrink-0">{book.pages_remaining} left</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); log() }} className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={book.pages_remaining}
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="Pages read today"
          className="flex-1 min-w-0 rounded-xl bg-muted/60 px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={saving || !pages}
          className="shrink-0 rounded-xl bg-violet-600 text-white px-4 text-sm font-bold disabled:opacity-40 active:scale-95 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Log
        </button>
      </form>
    </div>
  )
}

export default function CurrentlyReading({ readings, onLogged }: Props): JSX.Element {
  const supabase = createClient()
  const [goal, setGoal] = useState<number | null>(null)
  const [todayPages, setTodayPages] = useState(0)
  const [weekPages, setWeekPages] = useState(0)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const current = readings.filter(r => r.status === 'reading' && r.pages_remaining > 0)
  const queued = readings.filter(r => r.status === 'to_read').length

  // Reload today's and this week's pages whenever the books change (after a log)
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const saved = Number(user.user_metadata?.reading_goal)
      setGoal(saved > 0 ? saved : null)

      const today = toLocalDateKey(new Date())
      const { data } = await supabase
        .from('reading_logs')
        .select('reading_date, pages_read')
        .eq('user_id', user.id)
        .gte('reading_date', addDays(today, -6))
        .lte('reading_date', today)
      const logs = data ?? []
      setTodayPages(logs.filter(l => l.reading_date === today).reduce((a, l) => a + (l.pages_read ?? 0), 0))
      setWeekPages(logs.reduce((a, l) => a + (l.pages_read ?? 0), 0))
    }
    load()
  }, [readings])

  async function saveGoal() {
    const value = Math.floor(Number(goalInput))
    const next = value > 0 ? value : null
    const { error } = await supabase.auth.updateUser({ data: { reading_goal: next } })
    if (error) {
      toast.error("Couldn't save your goal")
      return
    }
    setGoal(next)
    setEditingGoal(false)
  }

  const pct = goal ? Math.min(100, Math.round((todayPages / goal) * 100)) : 0
  const r = 22
  const circumference = 2 * Math.PI * r

  return (
    <section className="space-y-3">
      {/* Daily goal */}
      <div className="rounded-3xl border border-border bg-card p-4 flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
            <circle
              cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
              className={pct >= 100 ? 'stroke-emerald-500' : 'stroke-violet-600'}
              strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            />
          </svg>
          <Target className={`absolute inset-0 m-auto w-5 h-5 ${pct >= 100 ? 'text-emerald-500' : 'text-violet-600'}`} />
        </div>

        {editingGoal ? (
          <form onSubmit={(e) => { e.preventDefault(); saveGoal() }} className="flex-1 flex gap-2 min-w-0">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              min={0}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Pages per day"
              className="flex-1 min-w-0 rounded-xl bg-muted/60 px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button type="submit" className="rounded-xl bg-violet-600 text-white px-3 text-sm font-bold">Save</button>
          </form>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Today</p>
            <p className="text-lg font-black leading-tight">
              {todayPages}{goal ? <span className="text-muted-foreground font-bold"> / {goal} pages</span> : ' pages'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {goal && todayPages >= goal ? 'Goal reached 🎉 · ' : ''}{weekPages} pages in the last 7 days
            </p>
          </div>
        )}

        {!editingGoal && (
          <button
            onClick={() => { setGoalInput(goal ? String(goal) : ''); setEditingGoal(true) }}
            className="shrink-0 text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> {goal ? 'Goal' : 'Set goal'}
          </button>
        )}
      </div>

      {/* Books in progress */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-black uppercase tracking-tight flex items-center gap-1.5">
          <BookMarked className="w-4 h-4 text-orange-500" /> Currently Reading
        </h2>
      </div>
      {current.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">
          {queued > 0
            ? `Nothing in progress. Log pages on one of your ${queued} "To read" books to start it.`
            : 'Add a book with the + button to start reading.'}
        </p>
      ) : (
        <div className="space-y-2">
          {current.map(book => <QuickLog key={book.id} book={book} onLogged={onLogged} />)}
        </div>
      )}
    </section>
  )
}
