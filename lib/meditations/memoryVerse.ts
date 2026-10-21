import { FRENCH_BOOK_NAMES, TRANSLATIONS, displayBook } from '@/components/bible/bibleConstants'
import { fetchChapter, parseReference } from '@/lib/bible/source'
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

// Every Bible version in the app can be looked up (French included, via getBible)
export const LOOKUP_TRANSLATIONS = TRANSLATIONS

export function lookupTranslation(id: string | null | undefined) {
  return id && LOOKUP_TRANSLATIONS.some(t => t.id === id) ? id : 'kjv'
}

// Resolves a reference like "Psalm 119:11" or "Jean 3:16" to its normalised reference and text
export async function lookUpVerse(reference: string, translation: string) {
  const ref = parseReference(reference, FRENCH_BOOK_NAMES)
  if (!ref) throw new Error('Not a reference')
  const verses = await fetchChapter(ref.book, ref.chapter, translation)
  const from = ref.verseStart ?? 1
  const to = ref.verseEnd ?? ref.verseStart ?? verses.length
  const picked = verses.filter(v => v.verse >= from && v.verse <= to)
  if (picked.length === 0) throw new Error('Verse not found')
  const book = displayBook(ref.book, translation)
  const span = ref.verseStart ? `:${from}${to !== from ? `-${to}` : ''}` : ''
  return {
    reference: `${book} ${ref.chapter}${span}`,
    text: picked.map(v => v.text).join(' '),
  }
}
