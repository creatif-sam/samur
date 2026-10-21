'use client'

import { JSX, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import AddReading from './AddReading'
import ReadingCalendar from './ReadingCalendar'
import BookShelf from './BookShelf'
import CurrentlyReading from './CurrentlyReading'
import { READING_COLUMNS, STATUS_OPTIONS, type Reading, type ReadingCategory, type ReadingStatus } from '@/lib/readapp/reading'

import {
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Plus,
  Library,
  X,
  Loader2,
  Search,
} from 'lucide-react'

const CATEGORY_ORDER: ReadingCategory[] = [
  'faith', 'self_development', 'skill', 'philosophy',
  'psychology', 'leadership', 'productivity', 'miscellaneous',
]

export default function ReadingList(): JSX.Element {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editing, setEditing] = useState<Reading | null>(null)
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all')

  const sheetOpen = isAddOpen || !!editing

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    void loadReadings()
  }, [])

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [sheetOpen])

  const loadReadings = async (): Promise<void> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setReadings([]); setLoading(false); return
    }

    const { data, error } = await supabase
      .from('readings')
      .select(READING_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error); setLoading(false); return
    }

    setReadings((data ?? []) as Reading[])
    setLoading(false)
  }

  function closeSheet() {
    setIsAddOpen(false)
    setEditing(null)
  }

  const statusStats = useMemo(() => ({
    toRead: readings.filter(r => r.status === 'to_read').length,
    reading: readings.filter(r => r.status === 'reading').length,
    done: readings.filter(r => r.status === 'done').length,
    applied: readings.filter(r => r.status === 'applied').length,
  }), [readings])

  const filtering = query.trim() !== '' || statusFilter !== 'all'

  const shelves = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = readings.filter(r =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || r.title.toLowerCase().includes(q) || (r.author ?? '').toLowerCase().includes(q)),
    )
    const byCategory: Partial<Record<ReadingCategory, Reading[]>> = {}
    for (const reading of matches) {
      if (!byCategory[reading.category]) byCategory[reading.category] = []
      byCategory[reading.category]!.push(reading)
    }
    return CATEGORY_ORDER
      .filter(cat => (byCategory[cat]?.length ?? 0) > 0)
      .map(cat => ({ category: cat, books: byCategory[cat]! }))
  }, [readings, query, statusFilter])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
          <p className="animate-pulse text-violet-600 font-bold uppercase tracking-widest text-xs">Opening Library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground pb-24 transition-colors duration-300">
      <main className="space-y-6 max-w-md mx-auto">
        {/* Status Stats (tap to filter the library) */}
        <section className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          <Stat icon={<BookOpen className="w-4 h-4" />} label="To Read" value={statusStats.toRead} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30" active={statusFilter === 'to_read'} onClick={() => setStatusFilter(f => f === 'to_read' ? 'all' : 'to_read')} />
          <Stat icon={<BookMarked className="w-4 h-4" />} label="Reading" value={statusStats.reading} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" active={statusFilter === 'reading'} onClick={() => setStatusFilter(f => f === 'reading' ? 'all' : 'reading')} />
          <Stat icon={<CheckCircle className="w-4 h-4" />} label="Done" value={statusStats.done} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-950/30" active={statusFilter === 'done'} onClick={() => setStatusFilter(f => f === 'done' ? 'all' : 'done')} />
          <Stat icon={<Lightbulb className="w-4 h-4" />} label="Applied" value={statusStats.applied} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-950/30" active={statusFilter === 'applied'} onClick={() => setStatusFilter(f => f === 'applied' ? 'all' : 'applied')} />
        </section>

        {/* Today's goal and quick logging */}
        <CurrentlyReading readings={readings} onLogged={loadReadings} />

        {/* Calendar Card */}
        <section className="rounded-3xl bg-card dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm border border-border">
          <ReadingCalendar readings={readings} />
        </section>

        {/* Library Shelves Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-foreground uppercase tracking-tight">Your Library</h2>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{readings.length} Total</span>
          </div>

          {readings.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title or author"
                  className="w-full rounded-2xl bg-muted/50 pl-9 pr-9 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
                {([{ value: 'all' as const, label: 'All' }, ...STATUS_OPTIONS]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      statusFilter === opt.value ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {readings.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-[32px] border-2 border-dashed border-border transition-all">
                <Library className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-bold italic">Your library is empty.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add your first book to get started.</p>
              </div>
            ) : shelves.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No books match.</p>
            ) : (
              shelves.map(({ category, books }) => (
                <BookShelf
                  // Remount when filtering starts/stops so shelves open to show matches
                  key={`${category}-${filtering}`}
                  category={category}
                  books={books}
                  onLogged={loadReadings}
                  onEdit={setEditing}
                  defaultOpen={filtering}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-30">
        <button
          onClick={() => setIsAddOpen(true)}
          aria-label="Add book"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-500/40 active:scale-90 transition-all hover:bg-violet-700 hover:rotate-90"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* ADD / EDIT SHEET */}
      {mounted && sheetOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={closeSheet}
          />

          <div
            className="relative bg-card dark:bg-zinc-950 w-full max-w-lg rounded-t-[40px] border-t border-border p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 ease-out max-h-[92dvh] overflow-y-auto overscroll-contain"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 cursor-pointer" onClick={closeSheet} />

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">{editing ? 'Edit Book' : 'Add New Book'}</h3>
              <button
                onClick={closeSheet}
                className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AddReading
              key={editing?.id ?? 'new'}
              reading={editing ?? undefined}
              onCreated={() => { loadReadings(); closeSheet() }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function Stat({ icon, label, value, color, bg, active, onClick }: {
  icon: JSX.Element, label: string, value: number, color: string, bg: string, active: boolean, onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[105px] flex-1 rounded-2xl bg-card border p-3 flex flex-col items-center justify-center shadow-sm transition-all duration-300 active:scale-95 ${active ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-border'}`}
    >
      <div className={`p-2 rounded-xl mb-1.5 ${bg} ${color}`}>
        {icon}
      </div>
      <div className="text-xl font-black text-foreground leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mt-1.5">{label}</div>
    </button>
  )
}
