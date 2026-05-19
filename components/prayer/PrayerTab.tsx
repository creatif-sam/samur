'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PrayerTimer from './PrayerTimer'
import PrayerCalendar from './PrayerCalendar'

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'personal' | 'family' | 'intercession' | 'guidance' | 'healing' | 'thanksgiving'
type Status = 'active' | 'answered' | 'ongoing'

interface PrayerEntry {
  id: string
  date: string
  completed: boolean
  duration_minutes: number | null
  notes: string | null
  listened_to_god?: boolean
}

interface PrayerRequest {
  id: string
  title: string
  description: string | null
  category: Category
  status: Status
  is_shared: boolean
  answer_note: string | null
  answered_at: string | null
  created_at: string
}

interface DiaryPage {
  id: string
  title: string
  content: string | null
  created_at: string
  section_id: string
}

interface DiarySection {
  id: string
  title: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  personal: 'Personal',
  family: 'Family',
  intercession: 'Intercession',
  guidance: 'Guidance',
  healing: 'Healing',
  thanksgiving: 'Thanksgiving',
}

const CATEGORY_COLORS: Record<Category, string> = {
  personal:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  family:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  intercession: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  guidance:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  healing:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  thanksgiving: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

const QUICK_DURATIONS = [5, 10, 15, 20, 30]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function calcStreak(entries: PrayerEntry[]): number {
  const doneSet = new Set(entries.filter(e => e.completed).map(e => e.date))
  let streak = 0
  const d = new Date()
  // allow today to be incomplete (streak extends if yesterday was done)
  if (!doneSet.has(todayISO())) d.setDate(d.getDate() - 1)
  while (doneSet.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrayerTab(): JSX.Element {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">
      {userId && (
        <PrayerTimer
          userId={userId}
          onSessionComplete={() => setCalendarRefreshKey(k => k + 1)}
        />
      )}
      {userId && (
        <PrayerCalendar userId={userId} refreshKey={calendarRefreshKey} />
      )}
    </div>
  )
}


