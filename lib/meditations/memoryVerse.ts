import { TRANSLATIONS } from '@/components/bible/bibleConstants'
import { addDays } from '@/lib/dates'

export type MemoryVerse = {
  id: string
  user_id: string
  day: string
  reference: string
  text: string
  translation: string | null
  visibility: 'private' | 'shared'
  memorized: boolean
  review_stage?: number
  next_review?: string | null
}

// Spaced review: first review the day after choosing, then 3, 7, 14 and 30 days
// after each successful one. Passing the last review marks the verse memorized.
const REVIEW_GAPS = [3, 7, 14, 30]
export const REVIEW_STAGES = REVIEW_GAPS.length + 1

export function isReviewDue(verse: MemoryVerse, today: string) {
  if (verse.day >= today) return false
  if ((verse.review_stage ?? 0) >= REVIEW_STAGES) return false
  return (verse.next_review ?? addDays(verse.day, 1)) <= today
}

export function reviewUpdate(verse: MemoryVerse, remembered: boolean, today: string) {
  if (!remembered) return { review_stage: 0, next_review: addDays(today, 1) }
  const stage = (verse.review_stage ?? 0) + 1
  if (stage >= REVIEW_STAGES) return { review_stage: stage, next_review: null, memorized: true }
  return { review_stage: stage, next_review: addDays(today, REVIEW_GAPS[stage - 1]) }
}

// bible-api.com has no French texts (LSG/NEF return 404); those verses can be typed in
export const LOOKUP_TRANSLATIONS = TRANSLATIONS.filter(t => t.id !== 'lsg' && t.id !== 'nef')

export function lookupTranslation(id: string | null | undefined) {
  return id && LOOKUP_TRANSLATIONS.some(t => t.id === id) ? id : 'kjv'
}

// Resolves a reference like "Psalm 119:11" to its normalised reference and text
export async function lookUpVerse(reference: string, translation: string) {
  const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference.trim())}?translation=${translation}`)
  if (!res.ok) throw new Error(`Verse lookup failed (${res.status})`)
  const data = await res.json()
  if (!data?.text) throw new Error('Verse not found')
  return {
    reference: String(data.reference || reference).trim(),
    text: String(data.text).replace(/\s+/g, ' ').trim(),
  }
}
