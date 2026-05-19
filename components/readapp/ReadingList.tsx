'use client'

import { JSX, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import AddReading from './AddReading'
import ReadingCalendar from './ReadingCalendar'
import BookShelf from './BookShelf'

import {
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Plus,
  Library,
  X,
  Loader2
} from 'lucide-react'

type ReadingStatus = 'to_read' | 'reading' | 'done' | 'applied'
type ReadingCategory = 'faith' | 'self_development' | 'skill' | 'philosophy' | 'psychology' | 'leadership' | 'productivity' | 'miscellaneous'

interface Reading {
  id: string
  title: string
  author?: string
  status: ReadingStatus
  category: ReadingCategory
  total_pages: number
  pages_remaining: number
}

const CATEGORY_ORDER: ReadingCategory[] = [
  'faith', 'self_development', 'skill', 'philosophy',
  'psychology', 'leadership', 'productivity', 'miscellaneous',
]

export default function ReadingList(): JSX.Element {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    void loadReadings()
  }, [])

  useEffect(() => {
    if (isAddOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isAddOpen])

  const loadReadings = async (): Promise<void> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setReadings([]); setLoading(false); return
    }

    const { data, error } = await supabase
      .from('readings')
      .select('id, title, author, status, category, total_pages, pages_remaining')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error); setLoading(false); return
    }

    setReadings(data ?? [])
    setLoading(false)
  }

  const statusStats = useMemo(() => ({
    toRead: readings.filter(r => r.status === 'to_read').length,
    reading: readings.filter(r => r.status === 'reading').length,
    done: readings.filter(r => r.status === 'done').length,
    applied: readings.filter(r => r.status === 'applied').length,
  }), [readings])

  const shelves = useMemo(() => {
    const byCategory: Partial<Record<ReadingCategory, Reading[]>> = {}
    for (const reading of readings) {
      if (!byCategory[reading.category]) byCategory[reading.category] = []
      byCategory[reading.category]!.push(reading)
    }
    return CATEGORY_ORDER
      .filter(cat => (byCategory[cat]?.length ?? 0) > 0)
      .map(cat => ({ category: cat, books: byCategory[cat]! }))
  }, [readings])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
          <p className="animate-pulse text-violet-600 font-bold uppercase tracking-widest text-xs">Opening Library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 transition-colors duration-300">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600 p-1.5 rounded-lg shadow-lg shadow-violet-500/20">
            <Library className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">ReadApp</h1>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {/* Status Stats */}
        <section className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          <Stat icon={<BookOpen className="w-4 h-4" />} label="To Read" value={statusStats.toRead} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30" />
          <Stat icon={<BookMarked className="w-4 h-4" />} label="Reading" value={statusStats.reading} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" />
          <Stat icon={<CheckCircle className="w-4 h-4" />} label="Done" value={statusStats.done} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-950/30" />
          <Stat icon={<Lightbulb className="w-4 h-4" />} label="Applied" value={statusStats.applied} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-950/30" />
        </section>

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

          <div className="space-y-3">
            {shelves.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-[32px] border-2 border-dashed border-border transition-all">
                <Library className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-bold italic">Your library is empty.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add your first book to get started.</p>
              </div>
            ) : (
              shelves.map(({ category, books }) => (
                <BookShelf
                  key={category}
                  category={category}
                  books={books}
                  onLogged={loadReadings}
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
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-500/40 active:scale-90 transition-all hover:bg-violet-700 hover:rotate-90"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* MODAL PORTAL */}
      {mounted && isAddOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setIsAddOpen(false)} 
          />
          
          <div className="relative bg-card dark:bg-zinc-950 w-full max-w-lg rounded-t-[40px] border-t border-border p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setIsAddOpen(false)} />
            
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Add New Book</h3>
              <button 
                onClick={() => setIsAddOpen(false)} 
                className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AddReading onCreated={() => { loadReadings(); setIsAddOpen(false); }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function Stat({ icon, label, value, color, bg }: { icon: JSX.Element, label: string, value: number, color: string, bg: string }): JSX.Element {
  return (
    <div className="min-w-[105px] flex-1 rounded-2xl bg-card border border-border p-3 flex flex-col items-center justify-center shadow-sm transition-all duration-300">
      <div className={`p-2 rounded-xl mb-1.5 ${bg} ${color}`}>
        {icon}
      </div>
      <div className="text-xl font-black text-foreground leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mt-1.5">{label}</div>
    </div>
  )
}