import { FRENCH_BOOK_NAMES, displayBook } from '@/components/bible/bibleConstants'
import { fetchChapter, parseReference } from '@/lib/bible/source'

// A promise for a prayer request: "Philippians 4:6" or "Jean 3:16-17" becomes the
// reference as shown and the verse words (King James, or Louis Segond in French).
export const MAX_VERSES = 5

export type VerseLookup =
  | { ok: true; ref: string; text: string }
  | { ok: false; reason: 'unknown' | 'needs-verse' | 'not-found' | 'offline' }

export async function lookupVerse(query: string, language: 'en' | 'fr'): Promise<VerseLookup> {
  const ref = parseReference(query, FRENCH_BOOK_NAMES)
  if (!ref) return { ok: false, reason: 'unknown' }
  if (!ref.verseStart) return { ok: false, reason: 'needs-verse' }
  const translation = language === 'fr' ? 'lsg' : 'kjv'
  const start = ref.verseStart
  const end = Math.min(Math.max(ref.verseEnd ?? start, start), start + MAX_VERSES - 1)
  try {
    const verses = await fetchChapter(ref.book, ref.chapter, translation)
    const picked = verses.filter(v => v.verse >= start && v.verse <= end)
    if (!picked.length) return { ok: false, reason: 'not-found' }
    const label = `${displayBook(ref.book, translation)} ${ref.chapter}:${start}${end > start ? `-${end}` : ''}`
    return { ok: true, ref: label, text: picked.map(v => v.text.trim()).join(' ') }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}
