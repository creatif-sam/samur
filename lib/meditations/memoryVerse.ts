import { TRANSLATIONS } from '@/components/bible/bibleConstants'

export type MemoryVerse = {
  id: string
  user_id: string
  day: string
  reference: string
  text: string
  translation: string | null
  visibility: 'private' | 'shared'
  memorized: boolean
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
