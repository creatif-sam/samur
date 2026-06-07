'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  BOOKS, CHAPTER_COUNTS, FRENCH_BOOK_NAMES, TRANSLATIONS,
  type Verse, type SavedVerse, type VerseHighlight,
  isFrench, displayBook, apiUrl,
} from './bibleConstants'

export type BibleView = 'books' | 'chapters' | 'read' | 'saved' | 'search' | 'versions' | 'compare'

export function useBibleReader() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  const [view, setView] = useState<BibleView>('books')
  const [selectedBook, setSelectedBook] = useState('John')
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [translation, setTranslation] = useState('kjv')
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const [highlights, setHighlights] = useState<Map<string, VerseHighlight>>(new Map())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const [showChapterSheet, setShowChapterSheet] = useState(false)
  const [savingSelection, setSavingSelection] = useState(false)
  const [noteIsMulti, setNoteIsMulti] = useState(false)
  const [noteRef, setNoteRef] = useState('')
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const fontSizeClass = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-[18px]' }[fontSize]
  const fontSizeNext = { sm: 'md', md: 'lg', lg: 'sm' } as const
  const readScrollRef = useRef<HTMLDivElement>(null)
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null)
  const [versionLang, setVersionLang] = useState<'all' | 'en' | 'fr'>('all')
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [compareVerseNums, setCompareVerseNums] = useState<number[]>([])
  const [compareTranslations, setCompareTranslations] = useState<string[]>([])
  const [compareData, setCompareData] = useState<Map<string, Verse[]>>(new Map())
  const [compareLoadingSet, setCompareLoadingSet] = useState<Set<string>>(new Set())
  const [showAddTranslation, setShowAddTranslation] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [bookSort, setBookSort] = useState<'canonical' | 'alpha'>('canonical')
  const [recentBooks, setRecentBooks] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (view === 'read') {
      readScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [selectedBook, selectedChapter])

  useEffect(() => { if (view !== 'read') setShowChapterSheet(false) }, [view])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) })
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bible_recent_books')
      if (stored) setRecentBooks(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (view !== 'read') return
    loadChapter(selectedBook, selectedChapter)
    if (userId) loadHighlights(selectedBook, selectedChapter)
  }, [view, selectedBook, selectedChapter, translation, userId])

  useEffect(() => { if (userId) loadSavedVerses() }, [userId])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(searchQuery)}?translation=${translation}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSearchResults(data.verses ?? [])
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 600)
  }, [searchQuery])

  async function loadChapter(book: string, chapter: number) {
    setLoading(true); setError(null)
    try {
      const res = await fetch(apiUrl(book, chapter, translation))
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVerses(data.verses ?? [])
    } catch { setError('Could not load chapter. Check your connection.') }
    finally { setLoading(false) }
  }

  async function loadHighlights(book: string, chapter: number) {
    if (!userId) return
    const { data, error } = await supabase.from('verse_highlights').select('*')
      .eq('user_id', userId).eq('book', book).eq('chapter', chapter)
    if (error) { console.error('loadHighlights:', error); return }
    const map = new Map<string, VerseHighlight>()
    ;(data ?? []).forEach((h: VerseHighlight) => map.set(`${h.book}-${h.chapter}-${h.verse}`, h))
    setHighlights(map)
  }

  async function loadSavedVerses() {
    if (!userId) return
    const { data, error } = await supabase.from('saved_verses').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (error) { console.error('loadSavedVerses:', error); return }
    setSavedVerses(data ?? [])
    setSavedIds(new Set((data ?? []).map((v: SavedVerse) => `${v.book}-${v.chapter}-${v.verse}`)))
  }

  function formatRef(nums: number[]): string {
    if (nums.length === 0) return ''
    const sorted = [...nums].sort((a, b) => a - b)
    if (sorted.length === 1) return `${selectedChapter}:${sorted[0]}`
    const isConsec = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
    if (isConsec) return `${selectedChapter}:${sorted[0]}–${sorted[sorted.length - 1]}`
    return sorted.map(n => `${selectedChapter}:${n}`).join(', ')
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    swipeTouchStart.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!swipeTouchStart.current || selectedVerses.size > 0) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipeTouchStart.current.x
    const dy = Math.abs(t.clientY - swipeTouchStart.current.y)
    swipeTouchStart.current = null
    if (Math.abs(dx) < 60 || dy > 60) return
    if (dx < 0) nextChapter(); else prevChapter()
  }

  async function setVerseHighlight(verse: Verse, color: string | null) {
    if (!userId) return
    const key = `${selectedBook}-${selectedChapter}-${verse.verse}`
    const existing = highlights.get(key)
    if (color === null || (existing && existing.color === color)) {
      if (!existing) return
      const { error } = await supabase.from('verse_highlights').delete().eq('id', existing.id)
      if (error) { toast.error('Could not remove highlight'); return }
      setHighlights(prev => { const m = new Map(prev); m.delete(key); return m })
    } else if (existing) {
      const { data, error } = await supabase.from('verse_highlights')
        .update({ color }).eq('id', existing.id).select().single()
      if (error) { toast.error('Could not update highlight'); return }
      if (data) setHighlights(prev => new Map(prev).set(key, data))
    } else {
      const { data, error } = await supabase.from('verse_highlights')
        .insert({ user_id: userId, book: selectedBook, chapter: selectedChapter, verse: verse.verse, color })
        .select().single()
      if (error) { toast.error('Could not save highlight'); return }
      if (data) setHighlights(prev => new Map(prev).set(key, data))
    }
  }

  async function copySelectedVerses() {
    const label = TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
    const lines = vObjs.map(v => `${v.verse} ${v.text.trim()}`).join('\n')
    const ref = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)} (${label})`
    try { await navigator.clipboard.writeText(`${lines}\n— ${ref}`); toast.success('Copied!') }
    catch { toast.error('Could not copy') }
    setSelectedVerses(new Set())
  }

  async function shareSelectedVerses() {
    const label = TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
    const lines = vObjs.map(v => `${v.verse} ${v.text.trim()}`).join('\n')
    const ref = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)} (${label})`
    const text = `${lines}\n— ${ref}`
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); toast.success('Copied!') }
      catch { toast.error('Could not copy') }
    }
    setSelectedVerses(new Set())
  }

  async function saveSelectedVerses() {
    if (!userId) return
    setSavingSelection(true)
    try {
      const sortedNums = [...selectedVerses].sort((a, b) => a - b)
      const allSaved = sortedNums.every(n => savedIds.has(`${selectedBook}-${selectedChapter}-${n}`))
      if (allSaved) {
        for (const n of sortedNums) {
          const v = verses.find(vv => vv.verse === n)
          if (!v) continue
          const { error } = await supabase.from('saved_verses').delete()
            .eq('user_id', userId).eq('book', selectedBook).eq('chapter', selectedChapter).eq('verse', v.verse)
          if (!error) {
            const key = `${selectedBook}-${selectedChapter}-${v.verse}`
            setSavedIds(prev => { const s = new Set(prev); s.delete(key); return s })
            setSavedVerses(prev => prev.filter(sv => !(sv.book === selectedBook && sv.chapter === selectedChapter && sv.verse === v.verse)))
          }
        }
        toast.success('Verses removed')
      } else {
        const unsaved = sortedNums.filter(n => !savedIds.has(`${selectedBook}-${selectedChapter}-${n}`))
        for (const n of unsaved) {
          const v = verses.find(vv => vv.verse === n)
          if (!v) continue
          const { data, error } = await supabase.from('saved_verses')
            .insert({ user_id: userId, book: selectedBook, chapter: selectedChapter, verse: v.verse, text: v.text })
            .select().single()
          if (!error && data) {
            setSavedIds(prev => new Set(prev).add(`${selectedBook}-${selectedChapter}-${v.verse}`))
            setSavedVerses(prev => [data, ...prev])
          }
        }
        toast.success(`${unsaved.length} verse${unsaved.length > 1 ? 's' : ''} saved ✨`)
      }
      setSelectedVerses(new Set())
    } finally { setSavingSelection(false) }
  }

  async function highlightSelectedVerses(color: string | null) {
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    for (const n of sortedNums) {
      const v = verses.find(vv => vv.verse === n)
      if (v) await setVerseHighlight(v, color)
    }
    setShowHighlightPanel(false)
    setSelectedVerses(new Set())
  }

  function openNoteForSelection() {
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
    if (vObjs.length === 0) return
    const isMulti = vObjs.length > 1
    const refLabel = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)}`
    setNoteVerse(vObjs[0])
    setNoteIsMulti(isMulti)
    setNoteRef(isMulti ? refLabel : '')
    if (isMulti) setNoteContent(vObjs.map(v => `[${selectedChapter}:${v.verse}] ${v.text.trim()}`).join('\n\n'))
    setSelectedVerses(new Set())
    setShowHighlightPanel(false)
  }

  async function addVerseNote(v: Verse, extraContent: string) {
    if (!userId) return
    setSavingNote(true)
    try {
      const bookName = displayBook(selectedBook, translation)
      const pageTitle = noteRef || `${bookName} ${selectedChapter}:${v.verse}`
      const { data: nbs } = await supabase.from('notebooks').select('id, title')
        .eq('user_id', userId).ilike('title', 'Bible Notes')
      let notebookId: string
      if (nbs && nbs.length > 0) {
        notebookId = nbs[0].id
      } else {
        const { data, error } = await supabase.from('notebooks')
          .insert({ user_id: userId, title: 'Bible Notes', emoji: '📖', color: '#7719aa' })
          .select('id').single()
        if (error) throw error
        notebookId = data.id
      }
      const { data: sects } = await supabase.from('sections').select('id')
        .eq('notebook_id', notebookId).ilike('title', bookName)
      let sectionId: string
      if (sects && sects.length > 0) {
        sectionId = sects[0].id
      } else {
        const { data, error } = await supabase.from('sections')
          .insert({ notebook_id: notebookId, title: bookName }).select('id').single()
        if (error) throw error
        sectionId = data.id
      }
      const content = noteIsMulti
        ? (extraContent.trim() || v.text.trim())
        : (extraContent.trim() ? `${v.text.trim()}\n\n${extraContent.trim()}` : v.text.trim())
      const { error } = await supabase.from('pages')
        .insert({ section_id: sectionId, title: pageTitle, content })
      if (error) throw error
      toast.success('Note saved to Bible Notes 📖')
      setNoteVerse(null); setNoteContent(''); setNoteRef(''); setNoteIsMulti(false)
    } catch { toast.error('Could not save note') }
    finally { setSavingNote(false) }
  }

  async function fetchCompareTranslation(tid: string, verseNums: number[]) {
    setCompareLoadingSet(prev => new Set(prev).add(tid))
    try {
      const res = await fetch(apiUrl(selectedBook, selectedChapter, tid))
      if (!res.ok) throw new Error()
      const data = await res.json()
      const sorted = [...verseNums].sort((a, b) => a - b)
      const extracted = sorted.map(n => (data.verses as Verse[]).find(v => v.verse === n)).filter(Boolean) as Verse[]
      setCompareData(prev => new Map(prev).set(tid, extracted))
    } catch { setCompareData(prev => new Map(prev).set(tid, [])) }
    finally { setCompareLoadingSet(prev => { const s = new Set(prev); s.delete(tid); return s }) }
  }

  function openCompare() {
    const nums = [...selectedVerses].sort((a, b) => a - b)
    setCompareVerseNums(nums)
    setCompareTranslations([translation])
    setCompareData(new Map())
    setSelectedVerses(new Set())
    setShowHighlightPanel(false)
    fetchCompareTranslation(translation, nums)
    setView('compare')
  }

  function addCompareTranslation(tid: string) {
    if (compareTranslations.includes(tid)) return
    setCompareTranslations(prev => [...prev, tid])
    fetchCompareTranslation(tid, compareVerseNums)
    setShowAddTranslation(false)
  }

  function removeCompareTranslation(tid: string) {
    setCompareTranslations(prev => prev.filter(t => t !== tid))
    setCompareData(prev => { const m = new Map(prev); m.delete(tid); return m })
  }

  function openBook(book: string) {
    setSelectedBook(book); setView('chapters'); setBookSearch('')
    setRecentBooks(prev => {
      const next = [book, ...prev.filter(b => b !== book)].slice(0, 10)
      try { localStorage.setItem('bible_recent_books', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function openChapter(ch: number) { setSelectedChapter(ch); setView('read') }

  function prevChapter() {
    if (selectedChapter > 1) { setSelectedChapter(c => c - 1) }
    else {
      const idx = BOOKS.indexOf(selectedBook)
      if (idx > 0) { setSelectedBook(BOOKS[idx - 1]); setSelectedChapter(CHAPTER_COUNTS[BOOKS[idx - 1]]) }
    }
  }

  function nextChapter() {
    const max = CHAPTER_COUNTS[selectedBook] ?? 1
    if (selectedChapter < max) { setSelectedChapter(c => c + 1) }
    else {
      const idx = BOOKS.indexOf(selectedBook)
      if (idx < BOOKS.length - 1) { setSelectedBook(BOOKS[idx + 1]); setSelectedChapter(1) }
    }
  }

  const displayedBooks = useMemo(() => {
    let list: string[] = showRecent && recentBooks.length > 0
      ? recentBooks.filter(b => BOOKS.includes(b)) : [...BOOKS]
    if (bookSearch.trim()) {
      const q = bookSearch.toLowerCase()
      list = list.filter(b => b.toLowerCase().includes(q) ||
        (isFrench(translation) && (FRENCH_BOOK_NAMES[b] ?? '').toLowerCase().includes(q)))
    }
    if (bookSort === 'alpha') {
      list = [...list].sort((a, b) => displayBook(a, translation).localeCompare(displayBook(b, translation)))
    }
    return list
  }, [bookSearch, bookSort, showRecent, recentBooks, translation])

  return {
    router,
    userId,
    view, setView,
    selectedBook,
    selectedChapter, setSelectedChapter,
    translation, setTranslation,
    verses, loading, error,
    savedVerses, savedIds,
    highlights,
    selectedVerses, setSelectedVerses,
    showHighlightPanel, setShowHighlightPanel,
    showChapterSheet, setShowChapterSheet,
    savingSelection,
    noteIsMulti, noteRef,
    fontSize, setFontSize,
    fontSizeClass, fontSizeNext,
    readScrollRef,
    versionLang, setVersionLang,
    noteVerse, setNoteVerse,
    noteContent, setNoteContent,
    savingNote,
    compareVerseNums, compareTranslations,
    compareData, compareLoadingSet,
    showAddTranslation, setShowAddTranslation,
    bookSearch, setBookSearch,
    bookSort, setBookSort,
    showRecent, setShowRecent,
    displayedBooks,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    searching,
    handleTouchStart, handleTouchEnd,
    formatRef,
    copySelectedVerses, shareSelectedVerses, saveSelectedVerses,
    highlightSelectedVerses,
    openNoteForSelection,
    addVerseNote,
    openCompare, addCompareTranslation, removeCompareTranslation,
    openBook, openChapter, prevChapter, nextChapter,
  }
}
