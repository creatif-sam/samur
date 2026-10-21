// Bible reading plans. Schedules are computed here; the bible_plans table only
// stores each person's start date and completed days.

import { BOOKS, CHAPTER_COUNTS, displayBook } from '@/components/bible/bibleConstants'
import { daysBetween } from '@/lib/dates'

export type PlanChapter = { book: string; chapter: number }

export interface ReadingPlan {
  key: string
  title: string
  description: string
  days: number
  books: string[]
}

const NT_START = BOOKS.indexOf('Matthew')

export const READING_PLANS: ReadingPlan[] = [
  { key: 'bible-year', title: 'Bible in a Year', description: 'Every chapter, Genesis to Revelation, in 365 days', days: 365, books: BOOKS },
  { key: 'nt-90', title: 'New Testament in 90 Days', description: 'Matthew to Revelation, about 3 chapters a day', days: 90, books: BOOKS.slice(NT_START) },
  { key: 'gospels-30', title: 'The Gospels in 30 Days', description: 'Matthew, Mark, Luke and John, about 3 chapters a day', days: 30, books: ['Matthew', 'Mark', 'Luke', 'John'] },
  { key: 'psalms-proverbs-60', title: 'Psalms & Proverbs in 60 Days', description: 'Wisdom and worship, about 3 chapters a day', days: 60, books: ['Psalms', 'Proverbs'] },
  { key: 'proverbs-31', title: 'Proverbs in a Month', description: 'One chapter of wisdom each day for 31 days', days: 31, books: ['Proverbs'] },
]

export function getPlan(key: string) {
  return READING_PLANS.find(p => p.key === key) ?? null
}

const scheduleCache = new Map<string, PlanChapter[][]>()

// Chapters split as evenly as possible across the plan's days
export function planSchedule(plan: ReadingPlan): PlanChapter[][] {
  const cached = scheduleCache.get(plan.key)
  if (cached) return cached
  const chapters: PlanChapter[] = plan.books.flatMap(book =>
    Array.from({ length: CHAPTER_COUNTS[book] ?? 1 }, (_, i) => ({ book, chapter: i + 1 })),
  )
  const days: PlanChapter[][] = []
  for (let d = 0; d < plan.days; d++) {
    const from = Math.floor((d * chapters.length) / plan.days)
    const to = Math.floor(((d + 1) * chapters.length) / plan.days)
    days.push(chapters.slice(from, to))
  }
  scheduleCache.set(plan.key, days)
  return days
}

export function dayReading(plan: ReadingPlan, dayNumber: number) {
  return planSchedule(plan)[dayNumber - 1] ?? []
}

// "Genesis 1–3", "Genesis 50; Exodus 1–2"
export function formatReading(chapters: PlanChapter[], translation = 'kjv') {
  const parts: string[] = []
  let i = 0
  while (i < chapters.length) {
    const start = chapters[i]
    let end = start
    while (i + 1 < chapters.length && chapters[i + 1].book === start.book && chapters[i + 1].chapter === end.chapter + 1) {
      end = chapters[++i]
    }
    const name = displayBook(start.book, translation)
    parts.push(start.chapter === end.chapter ? `${name} ${start.chapter}` : `${name} ${start.chapter}–${end.chapter}`)
    i++
  }
  return parts.join('; ')
}

export interface PlanEnrollment {
  id: string
  user_id: string
  plan_key: string
  start_date: string
  completed_days: number[]
}

// Where someone is in a plan on a given day
export function planStatus(plan: ReadingPlan, enrollment: PlanEnrollment, todayKey: string) {
  const scheduledDay = Math.min(Math.max(daysBetween(enrollment.start_date, todayKey) + 1, 1), plan.days)
  const done = new Set(enrollment.completed_days)
  let nextDay: number | null = null
  for (let d = 1; d <= plan.days; d++) {
    if (!done.has(d)) { nextDay = d; break }
  }
  const finished = nextDay === null
  const behind = nextDay !== null && nextDay < scheduledDay ? scheduledDay - nextDay : 0
  const caughtUpToday = !finished && nextDay! > scheduledDay
  return {
    scheduledDay,
    nextDay,
    finished,
    behind,
    caughtUpToday,
    completed: done.size,
    percent: Math.round((done.size / plan.days) * 100),
  }
}
