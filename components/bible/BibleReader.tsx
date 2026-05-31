'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Search, Bookmark,
  BookOpen, X, BookMarked, Check, Loader2, ChevronDown, Highlighter,
  Copy, PenLine, History, Share2, Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

// ── Bible book list (KJV canonical order) ──────────────────────────────────
const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude',
  'Revelation',
]

const CHAPTER_COUNTS: Record<string, number> = {
  'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,
  'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,
  '1 Chronicles':29,'2 Chronicles':36,'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,
  'Psalms':150,'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,
  'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,'Joel':3,
  'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,'Habakkuk':3,'Zephaniah':3,
  'Haggai':2,'Zechariah':14,'Malachi':4,'Matthew':28,'Mark':16,'Luke':24,'John':21,
  'Acts':28,'Romans':16,'1 Corinthians':16,'2 Corinthians':13,'Galatians':6,
  'Ephesians':6,'Philippians':4,'Colossians':4,'1 Thessalonians':5,
  '2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,
  'Hebrews':13,'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,
  '3 John':1,'Jude':1,'Revelation':22,
}

const NT_START = 'Matthew'

// ── French book name display map (API keys stay English) ─────────────────
const FRENCH_BOOK_NAMES: Record<string, string> = {
  'Genesis':'Genèse','Exodus':'Exode','Leviticus':'Lévitique','Numbers':'Nombres',
  'Deuteronomy':'Deutéronome','Joshua':'Josué','Judges':'Juges','Ruth':'Ruth',
  '1 Samuel':'1 Samuel','2 Samuel':'2 Samuel','1 Kings':'1 Rois','2 Kings':'2 Rois',
  '1 Chronicles':'1 Chroniques','2 Chronicles':'2 Chroniques','Ezra':'Esdras',
  'Nehemiah':'Néhémie','Esther':'Esther','Job':'Job','Psalms':'Psaumes',
  'Proverbs':'Proverbes','Ecclesiastes':'Ecclésiaste','Song of Solomon':'Cantique des Cantiques',
  'Isaiah':'Ésaïe','Jeremiah':'Jérémie','Lamentations':'Lamentations',
  'Ezekiel':'Ézéchiel','Daniel':'Daniel','Hosea':'Osée','Joel':'Joël',
  'Amos':'Amos','Obadiah':'Abdias','Jonah':'Jonas','Micah':'Michée',
  'Nahum':'Nahoum','Habakkuk':'Habacuc','Zephaniah':'Sophonie','Haggai':'Aggée',
  'Zechariah':'Zacharie','Malachi':'Malachie',
  'Matthew':'Matthieu','Mark':'Marc','Luke':'Luc','John':'Jean','Acts':'Actes',
  'Romans':'Romains','1 Corinthians':'1 Corinthiens','2 Corinthians':'2 Corinthiens',
  'Galatians':'Galates','Ephesians':'Éphésiens','Philippians':'Philippiens',
  'Colossians':'Colossiens','1 Thessalonians':'1 Thessaloniciens',
  '2 Thessalonians':'2 Thessaloniciens','1 Timothy':'1 Timothée','2 Timothy':'2 Timothée',
  'Titus':'Tite','Philemon':'Philémon','Hebrews':'Hébreux','James':'Jacques',
  '1 Peter':'1 Pierre','2 Peter':'2 Pierre','1 John':'1 Jean','2 John':'2 Jean',
  '3 John':'3 Jean','Jude':'Jude','Revelation':'Apocalypse',
}

function isFrench(translation: string) {
  return translation === 'lsg' || translation === 'nef'
}

function displayBook(book: string, translation: string) {
  return isFrench(translation) ? (FRENCH_BOOK_NAMES[book] ?? book) : book
}

// ── Available translations ────────────────────────────────────────────────
const TRANSLATIONS = [
  { id: 'kjv',      label: 'KJV',      name: 'King James Version' },
  { id: 'asv',      label: 'ASV',      name: 'American Standard Version' },
  { id: 'web',      label: 'WEB',      name: 'World English Bible' },
  { id: 'bbe',      label: 'BBE',      name: 'Bible in Basic English' },
  { id: 'ylt',      label: 'YLT',      name: "Young's Literal Translation" },
  { id: 'darby',    label: 'DARBY',    name: 'Darby Bible' },
  { id: 'dra',      label: 'DRA',      name: 'Douay-Rheims' },
  { id: 'oeb-us',   label: 'OEB',      name: 'Open English Bible' },
  { id: 'lsg',      label: 'LSG',      name: 'Louis Segond (Français)' },
  { id: 'nef',      label: 'NEF',      name: 'Nouvelle Édition de Genève (Français)' },
]

interface Verse { verse: number; text: string }

interface SavedVerse {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
  created_at: string
}

interface VerseHighlight {
  id: string
  book: string
  chapter: number
  verse: number
  color: string
}

// ── Highlight colors ───────────────────────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-200/80 dark:bg-yellow-400/30', dot: 'bg-yellow-400' },
  { id: 'green',  bg: 'bg-green-200/80 dark:bg-green-400/30',   dot: 'bg-green-500' },
  { id: 'blue',   bg: 'bg-blue-200/80 dark:bg-blue-400/30',     dot: 'bg-blue-500' },
  { id: 'pink',   bg: 'bg-pink-200/80 dark:bg-pink-400/30',     dot: 'bg-pink-500' },
  { id: 'purple', bg: 'bg-violet-200/80 dark:bg-violet-400/30', dot: 'bg-violet-500' },
  { id: 'orange', bg: 'bg-orange-200/80 dark:bg-orange-400/30', dot: 'bg-orange-500' },
]

function highlightBg(color: string) {
  return HIGHLIGHT_COLORS.find(c => c.id === color)?.bg ?? ''
}

function apiUrl(book: string, chapter: number, translation: string) {
  return `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`
}

// ── helpers ──────────────────────────────────────────────────────────────────
function chapterArray(book: string) {
  const n = CHAPTER_COUNTS[book] ?? 1
  return Array.from({ length: n }, (_, i) => i + 1)
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BibleReader() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  // Navigation
  const [view, setView] = useState<'books' | 'chapters' | 'read' | 'saved' | 'search' | 'versions'>('books')
  const [selectedBook, setSelectedBook] = useState('John')
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT')
  const [translation, setTranslation] = useState('kjv')

  // Chapter data
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Saved verses
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Highlights & multi-verse selection
  const [highlights, setHighlights] = useState<Map<string, VerseHighlight>>(new Map())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const [showChapterSheet, setShowChapterSheet] = useState(false)
  const [savingSelection, setSavingSelection] = useState(false)
  const [noteIsMulti, setNoteIsMulti] = useState(false)
  const [noteRef, setNoteRef] = useState('')

  // Version search
  const [versionLang, setVersionLang] = useState<'all' | 'en' | 'fr'>('all')

  // Verse note
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Book browser
  const [bookSearch, setBookSearch] = useState('')
  const [bookSort, setBookSort] = useState<'canonical' | 'alpha'>('canonical')
  const [recentBooks, setRecentBooks] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)

  // Passage search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Close chapter sheet when leaving read view ────────────────────────
  useEffect(() => {
    if (view !== 'read') setShowChapterSheet(false)
  }, [view])

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // ── Recent books (localStorage) ─────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bible_recent_books')
      if (stored) setRecentBooks(JSON.parse(stored))
    } catch {}
  }, [])

  // ── Load chapter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'read') return
    loadChapter(selectedBook, selectedChapter)
    if (userId) loadHighlights(selectedBook, selectedChapter)
  }, [view, selectedBook, selectedChapter, translation, userId])

  async function loadChapter(book: string, chapter: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(book, chapter, translation))
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setVerses(data.verses ?? [])
    } catch {
      setError('Could not load chapter. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // ── Load saved verses ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    loadSavedVerses()
  }, [userId])

  async function loadHighlights(book: string, chapter: number) {
    if (!userId) return
    const { data, error } = await supabase
      .from('verse_highlights')
      .select('*')
      .eq('user_id', userId)
      .eq('book', book)
      .eq('chapter', chapter)
    if (error) { console.error('loadHighlights:', error); return }
    const map = new Map<string, VerseHighlight>()
    ;(data ?? []).forEach((h: VerseHighlight) => map.set(`${h.book}-${h.chapter}-${h.verse}`, h))
    setHighlights(map)
  }

  async function setVerseHighlight(verse: Verse, color: string | null) {
    if (!userId) return
    const key = `${selectedBook}-${selectedChapter}-${verse.verse}`
    const existing = highlights.get(key)

    if (color === null || (existing && existing.color === color)) {
      // remove highlight
      if (!existing) return
      const { error } = await supabase.from('verse_highlights').delete().eq('id', existing.id)
      if (error) { console.error('removeHighlight:', error); toast.error('Could not remove highlight'); return }
      setHighlights(prev => { const m = new Map(prev); m.delete(key); return m })
    } else if (existing) {
      // update color
      const { data, error } = await supabase
        .from('verse_highlights')
        .update({ color })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) { console.error('updateHighlight:', error); toast.error('Could not update highlight'); return }
      if (data) setHighlights(prev => new Map(prev).set(key, data))
    } else {
      // insert
      const { data, error } = await supabase
        .from('verse_highlights')
        .insert({ user_id: userId, book: selectedBook, chapter: selectedChapter, verse: verse.verse, color })
        .select()
        .single()
      if (error) { console.error('insertHighlight:', error); toast.error('Could not save highlight'); return }
      if (data) setHighlights(prev => new Map(prev).set(key, data))
    }
  }

  async function loadSavedVerses() {
    if (!userId) return
    const { data, error } = await supabase
      .from('saved_verses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) { console.error('loadSavedVerses:', error); return }
    setSavedVerses(data ?? [])
    const keys = new Set((data ?? []).map((v: SavedVerse) => `${v.book}-${v.chapter}-${v.verse}`))
    setSavedIds(keys)
  }

  // ── Ref formatter (single or multi-verse) ─────────────────────────────
  function formatRef(nums: number[]): string {
    if (nums.length === 0) return ''
    const sorted = [...nums].sort((a, b) => a - b)
    if (sorted.length === 1) return `${selectedChapter}:${sorted[0]}`
    const isConsec = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
    if (isConsec) return `${selectedChapter}:${sorted[0]}–${sorted[sorted.length - 1]}`
    return sorted.map(n => `${selectedChapter}:${n}`).join(', ')
  }

  // ── Copy selected verses ────────────────────────────────────────────────
  async function copySelectedVerses() {
    const label = TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
    const lines = vObjs.map(v => `${v.verse} ${v.text.trim()}`).join('\n')
    const ref = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)} (${label})`
    try {
      await navigator.clipboard.writeText(`${lines}\n— ${ref}`)
      toast.success('Copied!')
    } catch {
      toast.error('Could not copy')
    }
    setSelectedVerses(new Set())
  }

  // ── Share selected verses ───────────────────────────────────────────────
  async function shareSelectedVerses() {
    const label = TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
    const lines = vObjs.map(v => `${v.verse} ${v.text.trim()}`).join('\n')
    const ref = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)} (${label})`
    const text = `${lines}\n— ${ref}`
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ text }) } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); toast.success('Copied!') } catch { toast.error('Could not copy') }
    }
    setSelectedVerses(new Set())
  }

  // ── Save / unsave selected verses ──────────────────────────────────────
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
    } finally {
      setSavingSelection(false)
    }
  }

  // ── Highlight selected verses ───────────────────────────────────────────
  async function highlightSelectedVerses(color: string | null) {
    const sortedNums = [...selectedVerses].sort((a, b) => a - b)
    for (const n of sortedNums) {
      const v = verses.find(vv => vv.verse === n)
      if (v) await setVerseHighlight(v, color)
    }
    setShowHighlightPanel(false)
    setSelectedVerses(new Set())
  }
  // ── Add note to verse ────────────────────────────────────────────────────
  async function addVerseNote(v: Verse, extraContent: string) {
    if (!userId) return
    setSavingNote(true)
    try {
      const bookName = displayBook(selectedBook, translation)
      const pageTitle = noteRef || `${bookName} ${selectedChapter}:${v.verse}`

      // 1. Find or create "Bible Notes" notebook
      const { data: nbs } = await supabase
        .from('notebooks')
        .select('id, title')
        .eq('user_id', userId)
        .ilike('title', 'Bible Notes')
      let notebookId: string
      if (nbs && nbs.length > 0) {
        notebookId = nbs[0].id
      } else {
        const { data, error } = await supabase
          .from('notebooks')
          .insert({ user_id: userId, title: 'Bible Notes', emoji: '📖', color: '#7719aa' })
          .select('id')
          .single()
        if (error) throw error
        notebookId = data.id
      }

      // 2. Find or create section with book name
      const { data: sects } = await supabase
        .from('sections')
        .select('id')
        .eq('notebook_id', notebookId)
        .ilike('title', bookName)
      let sectionId: string
      if (sects && sects.length > 0) {
        sectionId = sects[0].id
      } else {
        const { data, error } = await supabase
          .from('sections')
          .insert({ notebook_id: notebookId, title: bookName })
          .select('id')
          .single()
        if (error) throw error
        sectionId = data.id
      }

      // 3. Create page with verse text + user note
      const content = noteIsMulti
        ? (extraContent.trim() || v.text.trim())
        : (extraContent.trim() ? `${v.text.trim()}\n\n${extraContent.trim()}` : v.text.trim())
      const { error } = await supabase
        .from('pages')
        .insert({ section_id: sectionId, title: pageTitle, content })
      if (error) throw error

      toast.success('Note saved to Bible Notes 📖')
      setNoteVerse(null)
      setNoteContent('')
      setNoteRef('')
      setNoteIsMulti(false)
    } catch {
      toast.error('Could not save note')
    } finally {
      setSavingNote(false)
    }
  }

  // ── Navigation helpers ──────────────────────────────────────────────────
  function openBook(book: string) {
    setSelectedBook(book)
    setView('chapters')
    setBookSearch('')
    setRecentBooks(prev => {
      const next = [book, ...prev.filter(b => b !== book)].slice(0, 10)
      try { localStorage.setItem('bible_recent_books', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function openChapter(ch: number) {
    setSelectedChapter(ch)
    setView('read')
  }

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

  // ── Search ──────────────────────────────────────────────────────────────
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
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 600)
  }, [searchQuery])

  const otBooks = BOOKS.slice(0, BOOKS.indexOf(NT_START))
  const ntBooks = BOOKS.slice(BOOKS.indexOf(NT_START))

  // ── Filtered + sorted book list for browser ──────────────────────────────
  const displayedBooks = useMemo(() => {
    let list: string[] =
      showRecent && recentBooks.length > 0
        ? recentBooks.filter(b => BOOKS.includes(b))
        : [...BOOKS]
    if (bookSearch.trim()) {
      const q = bookSearch.toLowerCase()
      list = list.filter(b =>
        b.toLowerCase().includes(q) ||
        (isFrench(translation) && (FRENCH_BOOK_NAMES[b] ?? '').toLowerCase().includes(q))
      )
    }
    if (bookSort === 'alpha') {
      list = [...list].sort((a, b) =>
        displayBook(a, translation).localeCompare(displayBook(b, translation))
      )
    }
    return list
  }, [bookSearch, bookSort, showRecent, recentBooks, translation])

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-background font-sans ${view === 'read' ? 'pb-44' : 'pb-28'}`}>
      <Toaster position="bottom-center" richColors />

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (view === 'read') setView('chapters')
            else if (view === 'chapters') setView('books')
            else if (view === 'saved' || view === 'search' || view === 'versions') setView('books')
            else router.back()
          }}
          className="p-1.5 rounded-xl hover:bg-muted transition shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          {view === 'books' && (
            <h1 className="text-lg font-bold">Books</h1>
          )}
          {view === 'chapters' && (
            <p className="text-base font-black uppercase tracking-tight truncate">{displayBook(selectedBook, translation)}</p>
          )}
          {view === 'read' && (
            <p className="text-base font-black uppercase tracking-tight truncate">
              {displayBook(selectedBook, translation)} <span className="text-violet-500">{selectedChapter}</span>
            </p>
          )}
          {view === 'versions' && <p className="text-base font-bold">Versions</p>}
          {view === 'saved' && <p className="text-base font-black uppercase tracking-tight">Saved Verses</p>}
          {view === 'search' && (
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search passage (e.g. John 3:16)"
              className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
            />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Books view: AZ sort + recent history */}
          {view === 'books' && (
            <>
              <button
                onClick={() => setBookSort(s => s === 'canonical' ? 'alpha' : 'canonical')}
                className={`flex items-center px-2.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition ${
                  bookSort === 'alpha'
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
                title={bookSort === 'alpha' ? 'Canonical order' : 'A–Z order'}
              >
                AZ
              </button>
              <button
                onClick={() => setShowRecent(v => !v)}
                className={`p-1.5 rounded-xl transition ${
                  showRecent ? 'bg-violet-100 dark:bg-violet-900/40' : 'hover:bg-muted'
                }`}
                title="Recently read"
              >
                <History className={`w-5 h-5 ${showRecent ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
              </button>
            </>
          )}

          {/* Other views: search, version, saved */}
          {view !== 'books' && view !== 'search' && (
            <>
              <button onClick={() => setView('search')} className="p-1.5 rounded-xl hover:bg-muted transition">
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setView(v => v === 'versions' ? 'books' : 'versions')}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] font-black uppercase tracking-wide transition ${
                  view === 'versions' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'}
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => setView(v => v === 'saved' ? 'books' : 'saved')}
                className={`p-1.5 rounded-xl transition ${view === 'saved' ? 'bg-violet-100 dark:bg-violet-900/40' : 'hover:bg-muted'}`}
              >
                <BookMarked className={`w-5 h-5 ${view === 'saved' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
              </button>
            </>
          )}
          {view === 'search' && searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="p-1.5 rounded-xl hover:bg-muted transition">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── SEARCH VIEW ── */}
      {view === 'search' && (
        <div className="px-4 pt-4 space-y-2">
          {searching && (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
          )}
          {!searching && searchQuery && searchResults.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">No results. Try a reference like "John 3:16".</p>
          )}
          {searchResults.map((v, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
                {v.book_name} {v.chapter}:{v.verse}
              </p>
              <p className="text-sm text-foreground leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── SAVED VERSES ── */}
      {view === 'saved' && (
        <div className="px-4 pt-4 space-y-3">
          {savedVerses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <BookMarked className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No saved verses yet</p>
              <p className="text-xs">Tap the bookmark on any verse to save it</p>
            </div>
          )}
          {savedVerses.map(v => (
            <div key={v.id} className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
                {v.book} {v.chapter}:{v.verse}
              </p>
              <p className="text-sm text-foreground leading-relaxed italic">"{v.text}"</p>
            </div>
          ))}
        </div>
      )}

      {/* ── VERSION PICKER ── */}
      {view === 'versions' && (
        <div className="pb-10">
          {/* Language filter row */}
          <div className="px-4 pt-3 pb-4">
            <button
              onClick={() => setVersionLang(l => l === 'fr' ? 'en' : l === 'en' ? 'all' : 'fr')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted active:bg-muted/70 transition"
            >
              <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-base font-medium">Language</span>
              <span className="text-sm text-muted-foreground font-medium">
                {versionLang === 'fr' ? 'Français' : versionLang === 'en' ? 'English' : 'All'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </div>

          {/* Section label */}
          <p className="px-4 text-[13px] font-bold text-foreground mb-1">Available</p>

          {/* Flat translation list */}
          <div className="divide-y divide-border">
            {TRANSLATIONS
              .filter(t =>
                versionLang === 'all' ? true
                : versionLang === 'fr' ? (t.id === 'lsg' || t.id === 'nef')
                : (t.id !== 'lsg' && t.id !== 'nef')
              )
              .map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTranslation(t.id); setView('books') }}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left active:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[15px] leading-snug">{t.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{t.name}</p>
                  </div>
                  {translation === t.id
                    ? <Check className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  }
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── BOOK BROWSER ── */}
      {view === 'books' && (
        <div className="pb-10">
          {/* Search bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2.5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              {bookSearch && (
                <button onClick={() => setBookSearch('')}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Status chip when recent/alpha active */}
          {(showRecent || bookSort === 'alpha') && (
            <div className="flex gap-2 px-4 pb-2">
              {showRecent && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                  Recently Read
                </span>
              )}
              {bookSort === 'alpha' && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                  A–Z
                </span>
              )}
            </div>
          )}

          {/* Flat book list */}
          {displayedBooks.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">No books found</p>
          ) : (
            <div className="divide-y divide-border">
              {displayedBooks.map(book => (
                <button
                  key={book}
                  onClick={() => openBook(book)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left active:bg-muted/60 transition-colors"
                >
                  <span className="text-[17px] font-normal">{displayBook(book, translation)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHAPTER BROWSER ── */}
      {view === 'chapters' && (
        <div className="px-4 pt-4 pb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            {isFrench(translation) ? 'Sélectionner le chapitre' : 'Select Chapter'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {chapterArray(selectedBook).map(ch => (
              <button
                key={ch}
                onClick={() => openChapter(ch)}
                className={`aspect-square rounded-2xl text-sm font-bold flex items-center justify-center transition-all active:scale-90 ${
                  ch === selectedChapter
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── READING VIEW ── */}
      {view === 'read' && (
        <div className="px-4 pt-4 pb-6 space-y-1">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          )}
          {error && (
            <div className="text-center py-10 text-destructive text-sm">{error}</div>
          )}
          {!loading && !error && verses.map(v => {
            const key = `${selectedBook}-${selectedChapter}-${v.verse}`
            const highlight = highlights.get(key)
            const isSelected = selectedVerses.has(v.verse)
            return (
              <div key={v.verse}>
                <div
                  className={`flex gap-3 py-2 px-2 rounded-2xl transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-violet-100 dark:bg-violet-900/30 ring-1 ring-inset ring-violet-400 dark:ring-violet-600'
                      : highlight ? highlightBg(highlight.color) : 'active:bg-muted/60'
                  }`}
                  onClick={() => {
                    setSelectedVerses(prev => {
                      const next = new Set(prev)
                      if (next.has(v.verse)) next.delete(v.verse)
                      else next.add(v.verse)
                      return next
                    })
                    setShowHighlightPanel(false)
                  }}
                >
                  <span className={`text-[11px] font-black w-6 shrink-0 pt-0.5 text-right tabular-nums ${
                    isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-violet-400 dark:text-violet-500'
                  }`}>
                    {isSelected ? '✓' : v.verse}
                  </span>
                  <p className="flex-1 text-[15px] leading-[1.75] text-foreground">{v.text}</p>
                </div>
              </div>
            )
          })}

          {/* ── Verse action bottom sheet ── */}
          {selectedVerses.size > 0 && (() => {
            const sortedNums = [...selectedVerses].sort((a, b) => a - b)
            const allSaved = sortedNums.every(n => savedIds.has(`${selectedBook}-${selectedChapter}-${n}`))
            const firstH = highlights.get(`${selectedBook}-${selectedChapter}-${sortedNums[0]}`)
            const sharedHighlight = sortedNums.length === 1
              ? firstH
              : (sortedNums.every(n => highlights.get(`${selectedBook}-${selectedChapter}-${n}`)?.color === firstH?.color) ? firstH : undefined)
            const refLabel = `${displayBook(selectedBook, translation)} ${formatRef(sortedNums)}`
            return (
              <>
                {/* Backdrop — only dims reading content, not the bottom bars */}
                <div
                  className="fixed inset-x-0 top-0 bottom-[120px] z-[55] bg-black/30"
                  onClick={() => { setSelectedVerses(new Set()); setShowHighlightPanel(false) }}
                />
                {/* Sheet */}
                <div className="fixed bottom-[120px] left-0 right-0 z-[60] bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
                  </div>
                  {/* Verse ref + count badge */}
                  <div className="flex items-center justify-between px-6 py-2">
                    <p className="text-sm font-bold text-foreground">{refLabel}</p>
                    {selectedVerses.size > 1 && (
                      <span className="text-[11px] font-black text-violet-500 bg-violet-100 dark:bg-violet-900/40 px-2.5 py-1 rounded-full">
                        {selectedVerses.size} verses
                      </span>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center justify-around px-4 py-3 gap-1">
                    {/* Copy */}
                    <button
                      onClick={copySelectedVerses}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                        <Copy className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Copy</span>
                    </button>
                    {/* Share */}
                    <button
                      onClick={shareSelectedVerses}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Share</span>
                    </button>
                    {/* Save */}
                    <button
                      onClick={saveSelectedVerses}
                      disabled={savingSelection}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]"
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        allSaved ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-muted'
                      }`}>
                        {savingSelection
                          ? <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                          : <Bookmark className={`w-5 h-5 ${allSaved ? 'text-violet-600 dark:text-violet-400 fill-current' : ''}`} />
                        }
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">{allSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    {/* Highlight */}
                    <button
                      onClick={() => setShowHighlightPanel(v => !v)}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]"
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        sharedHighlight ? highlightBg(sharedHighlight.color) : 'bg-muted'
                      }`}>
                        <Highlighter className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Highlight</span>
                    </button>
                    {/* Note */}
                    <button
                      onClick={() => {
                        const vObjs = sortedNums.map(n => verses.find(v => v.verse === n)).filter(Boolean) as Verse[]
                        if (vObjs.length === 0) return
                        const isMulti = vObjs.length > 1
                        setNoteVerse(vObjs[0])
                        setNoteIsMulti(isMulti)
                        setNoteRef(isMulti ? refLabel : '')
                        if (isMulti) setNoteContent(vObjs.map(v => `[${selectedChapter}:${v.verse}] ${v.text.trim()}`).join('\n\n'))
                        setSelectedVerses(new Set())
                        setShowHighlightPanel(false)
                      }}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                        <PenLine className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Note</span>
                    </button>
                  </div>

                  {/* Highlight color row (conditional) */}
                  {showHighlightPanel && (
                    <div className="flex items-center gap-3 px-6 pb-5 pt-1 border-t border-border">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => highlightSelectedVerses(c.id)}
                          className={`w-8 h-8 rounded-full ${c.dot} transition-transform active:scale-90 ${
                            sharedHighlight?.color === c.id ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-110'
                          }`}
                        />
                      ))}
                      {sharedHighlight && (
                        <button
                          onClick={() => highlightSelectedVerses(null)}
                          className="ml-auto p-2 rounded-xl hover:bg-muted transition"
                          title="Remove highlight"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Safe area spacer */}
                  <div className="h-3" />
                </div>
              </>
            )
          })()}


        </div>
      )}
      {/* ── CHAPTER NAV BAR (read view) ── */}
      {view === 'read' && (
        <div className="fixed bottom-16 left-0 right-0 z-[56] bg-background/95 backdrop-blur border-t border-border flex items-center h-14 px-1">
          <button
            onClick={prevChapter}
            className="p-3 rounded-xl hover:bg-muted active:bg-muted transition"
            aria-label="Previous chapter"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowChapterSheet(v => !v)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-muted active:bg-muted transition"
          >
            <span className="text-sm font-bold">{displayBook(selectedBook, translation)} {selectedChapter}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showChapterSheet ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={nextChapter}
            className="p-3 rounded-xl hover:bg-muted active:bg-muted transition"
            aria-label="Next chapter"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── CHAPTER PICKER SHEET ── */}
      {view === 'read' && showChapterSheet && (
        <>
          <div
            className="fixed inset-0 z-[45] bg-black/20"
            onClick={() => setShowChapterSheet(false)}
          />
          <div className="fixed bottom-[120px] left-0 right-0 z-[50] bg-background rounded-t-3xl shadow-2xl border-t border-border animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
            </div>
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground px-4 pb-3">
              {displayBook(selectedBook, translation)}
            </p>
            <div className="grid grid-cols-5 gap-2 px-4 pb-5 max-h-56 overflow-y-auto">
              {chapterArray(selectedBook).map(ch => (
                <button
                  key={ch}
                  onClick={() => { setSelectedChapter(ch); setShowChapterSheet(false) }}
                  className={`aspect-square rounded-2xl text-sm font-bold flex items-center justify-center transition-all active:scale-90 ${
                    ch === selectedChapter
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── NOTE MODAL ── */}
      {noteVerse && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-background rounded-3xl border border-border shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-0.5">Add Bible Note</p>
                <p className="font-black text-base">
                  {noteRef || `${displayBook(selectedBook, translation)} ${selectedChapter}:${noteVerse.verse}`}
                </p>
              </div>
              <button
                onClick={() => { setNoteVerse(null); setNoteContent(''); setNoteRef(''); setNoteIsMulti(false) }}
                className="p-1.5 rounded-xl hover:bg-muted transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!noteIsMulti && (
              <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-violet-400 pl-3">
                &ldquo;{noteVerse.text.trim()}&rdquo;
              </p>
            )}
            <textarea
              autoFocus
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder={noteIsMulti ? 'Add your thoughts about these verses...' : 'Add your thoughts, reflections...'}
              rows={noteIsMulti ? 6 : 4}
              className="w-full bg-muted/50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setNoteVerse(null); setNoteContent(''); setNoteRef(''); setNoteIsMulti(false) }}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={() => addVerseNote(noteVerse, noteContent)}
                disabled={savingNote}
                className="flex-1 py-3 rounded-2xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Note'}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Saved to <span className="font-bold">Bible Notes</span> → <span className="font-bold">{displayBook(selectedBook, translation)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
