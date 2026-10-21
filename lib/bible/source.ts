// Where Bible text comes from, with on-device caching so chapters read once
// stay available offline. getBible.net is the main source (free, no key,
// includes French Louis Segond); bible-api.com covers the two translations
// getBible doesn't have in English (Darby, OEB).

import { BOOKS, type Verse } from '@/components/bible/bibleConstants'

type Source = { provider: 'getbible'; id: string } | { provider: 'bibleapi'; id: string }

const SOURCES: Record<string, Source> = {
  kjv: { provider: 'getbible', id: 'kjv' },
  asv: { provider: 'getbible', id: 'asv' },
  web: { provider: 'getbible', id: 'web' },
  bbe: { provider: 'getbible', id: 'basicenglish' },
  ylt: { provider: 'getbible', id: 'ylt' },
  dra: { provider: 'getbible', id: 'douayrheims' },
  lsg: { provider: 'getbible', id: 'ls1910' },
  martin: { provider: 'getbible', id: 'martin' },
  darby: { provider: 'bibleapi', id: 'darby' },
  'oeb-us': { provider: 'bibleapi', id: 'oeb-us' },
}

// Book-level and whole-Bible text for word search (bible-api-only versions search KJV)
function searchSourceId(translation: string) {
  const s = SOURCES[translation]
  return s?.provider === 'getbible' ? s.id : 'kjv'
}

export function searchesOtherTranslation(translation: string) {
  return SOURCES[translation]?.provider !== 'getbible'
}

// Not prefixed 'mastery-': the service worker clears unknown mastery-* caches on update,
// and scripture isn't user data, so it can stay across sign-outs and deploys
const CACHE = 'bible-text-v1'
const BIBLE_CACHE_LIMIT = 1500

export class ChapterUnavailableError extends Error {
  constructor(translation: string) {
    super(`This chapter isn't available in ${translation.toUpperCase()}`)
    this.name = 'ChapterUnavailableError'
  }
}

function bookNumber(book: string) {
  const i = BOOKS.indexOf(book)
  if (i < 0) throw new Error(`Unknown book ${book}`)
  return i + 1
}

function cleanText(text: string) {
  return text.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Cache first: scripture never changes, so a stored copy is always good
async function cachedJson(url: string): Promise<unknown> {
  let cache: Cache | null = null
  try { cache = typeof caches !== 'undefined' ? await caches.open(CACHE) : null } catch { cache = null }

  const hit = await cache?.match(url)
  if (hit) return hit.json()

  const res = await fetch(url)
  if (res.status === 404) throw new ChapterUnavailableError('')
  if (!res.ok) throw new Error(`Bible request failed (${res.status})`)
  const data = await res.clone().json()
  if (cache) {
    try {
      await cache.put(url, res)
      const keys = await cache.keys()
      for (let i = 0; i < keys.length - BIBLE_CACHE_LIMIT; i++) await cache.delete(keys[i])
    } catch { /* storage full: still return the text */ }
  }
  return data
}

export async function fetchChapter(book: string, chapter: number, translation: string): Promise<Verse[]> {
  const source = SOURCES[translation] ?? SOURCES.kjv
  try {
    if (source.provider === 'getbible') {
      const data = await cachedJson(`https://api.getbible.net/v2/${source.id}/${bookNumber(book)}/${chapter}.json`) as { verses?: { verse: number; text: string }[] }
      const verses = (data.verses ?? []).map(v => ({ verse: v.verse, text: cleanText(v.text) }))
      if (verses.length === 0) throw new ChapterUnavailableError(translation)
      return verses
    }
    const data = await cachedJson(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${source.id}`) as { verses?: { verse: number; text: string }[] }
    const verses = (data.verses ?? []).map(v => ({ verse: v.verse, text: cleanText(v.text) }))
    if (verses.length === 0) throw new ChapterUnavailableError(translation)
    return verses
  } catch (err) {
    if (err instanceof ChapterUnavailableError) throw new ChapterUnavailableError(translation === 'oeb-us' ? 'OEB' : translation)
    throw err
  }
}

// ---------- references ----------

export type Reference = { book: string; chapter: number; verseStart?: number; verseEnd?: number }

const ALIASES: Record<string, string> = {
  psalm: 'Psalms', ps: 'Psalms', psa: 'Psalms', song: 'Song of Solomon', 'song of songs': 'Song of Solomon',
  canticles: 'Song of Solomon', gen: 'Genesis', ex: 'Exodus', exo: 'Exodus', lev: 'Leviticus', num: 'Numbers',
  deut: 'Deuteronomy', josh: 'Joshua', judg: 'Judges', prov: 'Proverbs', eccl: 'Ecclesiastes', isa: 'Isaiah',
  jer: 'Jeremiah', lam: 'Lamentations', ezek: 'Ezekiel', dan: 'Daniel', matt: 'Matthew', mt: 'Matthew',
  mk: 'Mark', lk: 'Luke', jn: 'John', rom: 'Romans', gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians',
  col: 'Colossians', heb: 'Hebrews', jas: 'James', rev: 'Revelation', revelations: 'Revelation',
}

function normalizeBookName(name: string, frenchNames: Record<string, string>) {
  const n = name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (ALIASES[n]) return ALIASES[n]
  const exact = BOOKS.find(b => b.toLowerCase() === n || strip(frenchNames[b] ?? '') === strip(n))
  if (exact) return exact
  // Unique prefix, e.g. "phile" → Philemon, "1 cor" → 1 Corinthians
  const matches = BOOKS.filter(b => b.toLowerCase().startsWith(n) || strip(frenchNames[b] ?? '').startsWith(strip(n)))
  return matches.length === 1 ? matches[0] : null
}

// "John 3:16", "1 Cor 13", "Psalm 23:1-4", "Jean 3:16"
export function parseReference(query: string, frenchNames: Record<string, string>): Reference | null {
  const m = query.trim().match(/^((?:[1-3]\s*)?[\p{L}][\p{L}\s.]*?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/u)
  if (!m) return null
  const book = normalizeBookName(m[1].replace(/^([1-3])\s*/, '$1 '), frenchNames)
  if (!book) return null
  const ref: Reference = { book, chapter: Number(m[2]) }
  if (m[3]) ref.verseStart = Number(m[3])
  if (m[4]) ref.verseEnd = Number(m[4])
  return ref
}

// ---------- word search ----------

export type SearchHit = { book: string; chapter: number; verse: number; text: string }

type GetBibleBook = { chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }
type GetBibleWhole = { books: ({ nr: number } & GetBibleBook)[] }

function matchVerses(book: string, data: GetBibleBook, words: string[], limit: number, hits: SearchHit[]) {
  for (const ch of data.chapters) {
    for (const v of ch.verses) {
      const text = v.text.toLowerCase()
      if (words.every(w => text.includes(w))) {
        hits.push({ book, chapter: ch.chapter, verse: v.verse, text: cleanText(v.text) })
        if (hits.length >= limit) return
      }
    }
  }
}

export async function searchBook(book: string, query: string, translation: string, limit = 200) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const data = await cachedJson(`https://api.getbible.net/v2/${searchSourceId(translation)}/${bookNumber(book)}.json`) as GetBibleBook
  const hits: SearchHit[] = []
  matchVerses(book, data, words, limit, hits)
  return hits
}

// Downloads the whole translation once (~9 MB), then searches it from the device
export async function searchWholeBible(query: string, translation: string, limit = 300) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const data = await cachedJson(`https://api.getbible.net/v2/${searchSourceId(translation)}.json`) as GetBibleWhole
  const hits: SearchHit[] = []
  for (const b of data.books) {
    const book = BOOKS[b.nr - 1]
    if (!book) continue
    matchVerses(book, b, words, limit, hits)
    if (hits.length >= limit) break
  }
  return hits
}

export async function hasWholeBibleCached(translation: string) {
  try {
    const cache = await caches.open(CACHE)
    return !!(await cache.match(`https://api.getbible.net/v2/${searchSourceId(translation)}.json`))
  } catch {
    return false
  }
}
