'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BookMarked, Loader2, Pencil, Play, Target } from 'lucide-react'
import { addDays, toLocalDateKey } from '@/lib/dates'
import { type Reading } from '@/lib/readapp/reading'
import ReadingLogForm from './ReadingLogForm'

interface Props {
  readings: Reading[]
  onLogged: () => void
}

function QuickLog({ book, onLogged }: { book: Reading; onLogged: () => void }): JSX.Element {
  const read = book.total_pages - book.pages_remaining
  const pct = book.total_pages > 0 ? Math.round((read / book.total_pages) * 100) : 0

  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-black truncate">{book.title}</p>
        <span className="text-[10px] font-bold text-muted-foreground shrink-0">p. {read}/{book.total_pages} · {book.pages_remaining} left</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ReadingLogForm book={book} onLogged={onLogged} />
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
  const queuedBooks = readings.filter(r => r.status === 'to_read' && r.pages_remaining > 0)
  const [starting, setStarting] = useState<string | null>(null)

  // One tap to move a "To read" book into Currently Reading
  async function startBook(book: Reading) {
    setStarting(book.id)
    const { error } = await supabase.from('readings').update({ status: 'reading' }).eq('id', book.id)
    setStarting(null)
    if (error) { toast.error("Couldn't start that book"); return }
    toast.success(`Started ${book.title} 📖`)
    onLogged()
  }

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
          {queuedBooks.length > 0 ? 'Nothing in progress. Pick a book below to start.' : 'Add a book with the + button to start reading.'}
        </p>
      ) : (
        <div className="space-y-2">
          {current.map(book => <QuickLog key={book.id} book={book} onLogged={onLogged} />)}
        </div>
      )}

      {queuedBooks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            {current.length === 0 ? 'Start reading' : 'Up next'}
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {queuedBooks.slice(0, 8).map(book => (
              <button
                key={book.id}
                onClick={() => startBook(book)}
                disabled={starting !== null}
                className="shrink-0 max-w-[200px] flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold active:scale-95 disabled:opacity-50"
              >
                {starting === book.id ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Play className="w-3 h-3 text-orange-500 fill-orange-500 shrink-0" />}
                <span className="truncate">{book.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
