'use client'

import { JSX, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReadingCard from './ReadingCard'
import AddReading from './AddReading'

import {
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Plus,
  Library,
  X
} from 'lucide-react'
import ReadingCalendar from './ReadingCalendar'

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

export default function ReadingList(): JSX.Element {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)

  useEffect(() => {
    void loadReadings()
  }, [])

  // Prevent body scroll when modal is open
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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="animate-pulse text-violet-600 font-medium">Loading Library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white/80 px-4 py-3 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600 p-1.5 rounded-lg shadow-sm shadow-violet-200">
            <Library className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">ReadApp</h1>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {/* Status Stats - Horizontal Scroll */}
        <section className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
          <Stat icon={<BookOpen className="w-4 h-4" />} label="To Read" value={statusStats.toRead} color="bg-blue-50 text-blue-600" />
          <Stat icon={<BookMarked className="w-4 h-4" />} label="Reading" value={statusStats.reading} color="bg-orange-50 text-orange-600" />
          <Stat icon={<CheckCircle className="w-4 h-4" />} label="Done" value={statusStats.done} color="bg-green-50 text-green-600" />
          <Stat icon={<Lightbulb className="w-4 h-4" />} label="Applied" value={statusStats.applied} color="bg-yellow-50 text-yellow-600" />
        </section>

        {/* Calendar Card */}
        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <ReadingCalendar readings={readings} />
        </section>

        {/* Reading List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-800">Your Books</h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{readings.length} Total</span>
          </div>
          
          <div className="space-y-3">
            {readings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Your shelf is empty.</p>
              </div>
            ) : (
              readings.map(reading => (
                <ReadingCard
                  key={reading.id}
                  reading={reading}
                  onLogged={loadReadings}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-6 z-30">
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-200 active:scale-90 transition-all hover:bg-violet-700"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Add Reading Sheet (Mobile Optimized Modal) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsAddOpen(false)} />
          
          {/* Sheet Content */}
          <div className="relative bg-white w-full max-w-lg rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setIsAddOpen(false)} />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Add New Book</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <AddReading onCreated={() => { loadReadings(); setIsAddOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, color }: { icon: JSX.Element, label: string, value: number, color: string }): JSX.Element {
  return (
    <div className="min-w-[105px] flex-1 rounded-2xl bg-white border border-slate-100 p-3 flex flex-col items-center justify-center shadow-sm">
      <div className={`p-2 rounded-xl mb-1.5 ${color}`}>
        {icon}
      </div>
      <div className="text-lg font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{label}</div>
    </div>
  )
}