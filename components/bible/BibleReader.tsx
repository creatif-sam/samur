'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, Search, Bookmark,
  BookOpen, X, BookMarked, Check, Loader2,
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

interface Verse { verse: number; text: string }

interface SavedVerse {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
  created_at: string
}

function apiUrl(book: string, chapter: number) {
  return `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=kjv`
}

// ── helpers ──────────────────────────────────────────────────────────────────
function chapterArray(book: string) {
  const n = CHAPTER_COUNTS[book] ?? 1
  return Array.from({ length: n }, (_, i) => i + 1)
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BibleReader() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)

  // Navigation
  const [view, setView] = useState<'books' | 'chapters' | 'read' | 'saved' | 'search'>('books')
  const [selectedBook, setSelectedBook] = useState('John')
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT')

  // Chapter data
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Saved verses
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([])
  const [savingVerse, setSavingVerse] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // ── Load chapter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'read') return
    loadChapter(selectedBook, selectedChapter)
  }, [view, selectedBook, selectedChapter])

  async function loadChapter(book: string, chapter: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(book, chapter))
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

  async function loadSavedVerses() {
    if (!userId) return
    const { data } = await supabase
      .from('saved_verses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setSavedVerses(data ?? [])
    const keys = new Set((data ?? []).map((v: SavedVerse) => `${v.book}-${v.chapter}-${v.verse}`))
    setSavedIds(keys)
  }

  async function toggleSaveVerse(verse: Verse) {
    if (!userId) return
    const key = `${selectedBook}-${selectedChapter}-${verse.verse}`
    setSavingVerse(verse.verse)

    if (savedIds.has(key)) {
      // unsave
      const { error } = await supabase
        .from('saved_verses')
        .delete()
        .eq('user_id', userId)
        .eq('book', selectedBook)
        .eq('chapter', selectedChapter)
        .eq('verse', verse.verse)
      if (!error) {
        setSavedIds(prev => { const s = new Set(prev); s.delete(key); return s })
        setSavedVerses(prev => prev.filter(v => !(v.book === selectedBook && v.chapter === selectedChapter && v.verse === verse.verse)))
        toast.success('Verse removed')
      }
    } else {
      // save
      const { data, error } = await supabase
        .from('saved_verses')
        .insert({ user_id: userId, book: selectedBook, chapter: selectedChapter, verse: verse.verse, text: verse.text })
        .select()
        .single()
      if (!error && data) {
        setSavedIds(prev => new Set(prev).add(key))
        setSavedVerses(prev => [data, ...prev])
        toast.success('Verse saved ✨')
      }
    }
    setSavingVerse(null)
  }

  // ── Navigation helpers ──────────────────────────────────────────────────
  function openBook(book: string) {
    setSelectedBook(book)
    setView('chapters')
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
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(searchQuery)}?translation=kjv`)
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

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background font-sans pb-28">
      <Toaster position="bottom-center" richColors />

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        {view !== 'books' && (
          <button
            onClick={() => {
              if (view === 'read') setView('chapters')
              else if (view === 'chapters') setView('books')
              else setView('books')
            }}
            className="p-1.5 rounded-xl hover:bg-muted transition shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {view === 'books' && (
            <h1 className="text-lg font-black uppercase tracking-tight text-violet-600 dark:text-violet-400">Holy Bible</h1>
          )}
          {view === 'chapters' && (
            <p className="text-base font-black uppercase tracking-tight truncate">{selectedBook}</p>
          )}
          {view === 'read' && (
            <p className="text-base font-black uppercase tracking-tight truncate">
              {selectedBook} <span className="text-violet-500">{selectedChapter}</span>
            </p>
          )}
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
          {view !== 'search' && (
            <button onClick={() => setView('search')} className="p-1.5 rounded-xl hover:bg-muted transition">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {view === 'search' && searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="p-1.5 rounded-xl hover:bg-muted transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setView(v => v === 'saved' ? 'books' : 'saved')}
            className={`p-1.5 rounded-xl transition ${view === 'saved' ? 'bg-violet-100 dark:bg-violet-900/40' : 'hover:bg-muted'}`}
          >
            <BookMarked className={`w-5 h-5 ${view === 'saved' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
          </button>
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

      {/* ── BOOK BROWSER ── */}
      {view === 'books' && (
        <div className="px-4 pt-4 pb-6 space-y-6">
          {/* Testament toggle */}
          <div className="flex rounded-2xl bg-muted p-1 gap-1">
            {(['OT', 'NT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTestament(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  testament === t ? 'bg-violet-600 text-white shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {t === 'OT' ? 'Old Testament' : 'New Testament'}
              </button>
            ))}
          </div>

          {/* Book grid */}
          <div className="grid grid-cols-2 gap-2">
            {(testament === 'OT' ? otBooks : ntBooks).map(book => (
              <button
                key={book}
                onClick={() => openBook(book)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700 active:scale-[0.97] transition-all text-left"
              >
                <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="text-sm font-semibold truncate">{book}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CHAPTER BROWSER ── */}
      {view === 'chapters' && (
        <div className="px-4 pt-4 pb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Select Chapter</p>
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
            const isSaved = savedIds.has(key)
            return (
              <div
                key={v.verse}
                className="flex gap-3 py-2 px-2 rounded-2xl hover:bg-muted/50 transition-colors group"
              >
                <span className="text-[11px] font-black text-violet-400 dark:text-violet-500 w-6 shrink-0 pt-0.5 text-right tabular-nums">
                  {v.verse}
                </span>
                <p className="flex-1 text-[15px] leading-[1.75] text-foreground">{v.text}</p>
                <button
                  onClick={() => toggleSaveVerse(v)}
                  className="shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {savingVerse === v.verse
                    ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    : isSaved
                    ? <Check className="w-4 h-4 text-violet-500" />
                    : <Bookmark className="w-4 h-4 text-muted-foreground hover:text-violet-500 transition-colors" />
                  }
                </button>
              </div>
            )
          })}

          {/* Prev / Next chapter bar */}
          {!loading && !error && (
            <div className="flex gap-2 pt-6">
              <button
                onClick={prevChapter}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-border hover:bg-muted transition font-semibold text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={nextChapter}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white transition font-semibold text-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
