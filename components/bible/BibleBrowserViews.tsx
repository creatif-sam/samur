'use client'

import type { Dispatch, SetStateAction } from 'react'
import { ChevronRight, Check, Globe, Search, BookMarked, X, Loader2, BookOpen, Brain, CheckCircle2 } from 'lucide-react'
import type { SearchHit } from '@/lib/bible/source'
import { TRANSLATIONS, displayBook, chapterArray, type SavedVerse, isFrench } from './bibleConstants'
import type { BibleView } from './useBibleReader'

// ── Search View ───────────────────────────────────────────────────────────
interface SearchProps {
  searching: boolean
  searchQuery: string
  searchResults: SearchHit[]
  searchMode: 'reference' | 'words' | null
  searchError: string | null
  searchScope: 'book' | 'bible'
  setSearchScope: (s: 'book' | 'bible') => void
  wholeBibleReady: boolean
  searchesOtherTranslation: boolean
  selectedBook: string
  translation: string
  openPassage: (book: string, chapter: number) => void
}

function highlightWords(text: string, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  if (words.length === 0) return text
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="bg-amber-200/80 dark:bg-amber-500/30 rounded px-0.5">{part}</mark> : part,
  )
}

export function BibleSearchView({
  searching, searchQuery, searchResults, searchMode, searchError, searchScope, setSearchScope,
  wholeBibleReady, searchesOtherTranslation, selectedBook, translation, openPassage,
}: SearchProps) {
  const isWords = searchMode === 'words'
  return (
    <div className="px-4 pt-4 space-y-2">
      {!searchQuery.trim() && (
        <div className="text-center text-muted-foreground py-10 text-sm space-y-1">
          <p>Type a reference like <span className="font-semibold text-foreground">John 3:16</span> or <span className="font-semibold text-foreground">Psalm 23</span>,</p>
          <p>or words like <span className="font-semibold text-foreground">shepherd</span> to search the text.</p>
        </div>
      )}

      {isWords && searchQuery.trim() && (
        <div className="space-y-1.5 pb-1">
          <div className="flex bg-muted rounded-2xl p-1 gap-1">
            {(['book', 'bible'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => setSearchScope(scope)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${searchScope === scope ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                {scope === 'book' ? `In ${displayBook(selectedBook, translation)}` : 'Whole Bible'}
              </button>
            ))}
          </div>
          {searchScope === 'bible' && !wholeBibleReady && (
            <p className="text-[11px] text-muted-foreground px-1">The first whole-Bible search downloads the full text once (about 9 MB), then works offline.</p>
          )}
          {searchesOtherTranslation && (
            <p className="text-[11px] text-muted-foreground px-1">Word search uses the KJV text for this version.</p>
          )}
        </div>
      )}

      {searching && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      )}
      {!searching && searchError && (
        <p className="text-center text-destructive py-10 text-sm">{searchError}</p>
      )}
      {!searching && !searchError && searchQuery.trim() && searchResults.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">
          {isWords && searchQuery.trim().length < 3 ? 'Type at least 3 letters.' : 'No results.'}
        </p>
      )}
      {!searching && isWords && searchResults.length > 0 && (
        <p className="text-[11px] text-muted-foreground px-1">{searchResults.length}{searchResults.length >= 200 ? '+' : ''} verse{searchResults.length !== 1 ? 's' : ''}</p>
      )}
      {!searching && searchResults.map((v, i) => (
        <button
          key={`${v.book}-${v.chapter}-${v.verse}-${i}`}
          onClick={() => openPassage(v.book, v.chapter)}
          className="w-full text-left rounded-2xl bg-card border border-border p-4 space-y-1 active:bg-muted/60 transition-colors"
        >
          <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
            {displayBook(v.book, translation)} {v.chapter}:{v.verse}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{isWords ? highlightWords(v.text, searchQuery) : v.text}</p>
        </button>
      ))}
    </div>
  )
}

// ── Saved Verses View ─────────────────────────────────────────────────────
interface SavedProps {
  savedVerses: SavedVerse[]
  translation: string
  openPassage: (book: string, chapter: number) => void
  setAsMemoryVerse: (v: SavedVerse) => void
}

export function BibleSavedView({ savedVerses, translation, openPassage, setAsMemoryVerse }: SavedProps) {
  return (
    <div className="px-4 pt-4 space-y-3">
      {savedVerses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BookMarked className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">No saved verses yet</p>
          <p className="text-xs">Tap the bookmark on any verse to save it</p>
        </div>
      )}
      {savedVerses.map(v => (
        <div key={v.id} className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <button onClick={() => openPassage(v.book, v.chapter)} className="w-full text-left space-y-1">
            <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
              {displayBook(v.book, translation)} {v.chapter}:{v.verse}
            </p>
            <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{v.text.trim()}&rdquo;</p>
          </button>
          <div className="flex gap-2">
            <button onClick={() => openPassage(v.book, v.chapter)} className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground active:scale-95">
              <BookOpen className="w-3.5 h-3.5" /> Read chapter
            </button>
            <button onClick={() => setAsMemoryVerse(v)} className="flex items-center gap-1 rounded-xl bg-violet-100 dark:bg-violet-900/40 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 active:scale-95">
              <Brain className="w-3.5 h-3.5" /> Memory verse
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Version Picker ────────────────────────────────────────────────────────
interface VersionProps {
  versionLang: 'all' | 'en' | 'fr'
  setVersionLang: Dispatch<SetStateAction<'all' | 'en' | 'fr'>>
  translation: string
  setTranslation: (t: string) => void
  setView: (v: BibleView) => void
}

export function BibleVersionPicker({ versionLang, setVersionLang, translation, setTranslation, setView }: VersionProps) {
  return (
    <div className="pb-10">
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
      <p className="px-4 text-[13px] font-bold text-foreground mb-1">Available</p>
      <div className="divide-y divide-border">
        {TRANSLATIONS
          .filter(t =>
            versionLang === 'all' ? true
              : versionLang === 'fr' ? isFrench(t.id)
              : !isFrench(t.id)
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
  )
}

// ── Book Browser ──────────────────────────────────────────────────────────
interface BookBrowserProps {
  lastRead: { book: string; chapter: number } | null
  openPassage: (book: string, chapter: number) => void
  bookProgress: (book: string) => { read: number; total: number }
  bookSearch: string
  setBookSearch: (q: string) => void
  showRecent: boolean
  bookSort: 'canonical' | 'alpha'
  displayedBooks: string[]
  openBook: (book: string) => void
  translation: string
}

export function BibleBookBrowser({
  lastRead, openPassage, bookProgress,
  bookSearch, setBookSearch, showRecent, bookSort, displayedBooks, openBook, translation,
}: BookBrowserProps) {
  return (
    <div className="pb-10">
      {lastRead && !bookSearch && (
        <div className="px-4 pt-3">
          <button
            onClick={() => openPassage(lastRead.book, lastRead.chapter)}
            className="w-full flex items-center gap-3 rounded-2xl bg-violet-600 text-white px-4 py-3 text-left active:scale-[0.98] transition"
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Continue reading</p>
              <p className="text-base font-black truncate">{displayBook(lastRead.book, translation)} {lastRead.chapter}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/70" />
          </button>
        </div>
      )}
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

      {(showRecent || bookSort === 'alpha') && (
        <div className="flex gap-2 px-4 pb-2">
          {showRecent && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Recently Read</span>
          )}
          {bookSort === 'alpha' && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">A–Z</span>
          )}
        </div>
      )}

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
              <span className="flex items-center gap-2 shrink-0">
                {(() => {
                  const { read, total } = bookProgress(book)
                  if (read === 0) return null
                  return read === total
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Book read" />
                    : <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{read}/{total}</span>
                })()}
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chapter Browser ───────────────────────────────────────────────────────
interface ChapterBrowserProps {
  readChapters: Set<string>
  selectedBook: string
  selectedChapter: number
  openChapter: (ch: number) => void
  translation: string
}

export function BibleChapterBrowser({ readChapters, selectedBook, selectedChapter, openChapter, translation }: ChapterBrowserProps) {
  return (
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
                : readChapters.has(`${selectedBook}-${ch}`)
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700'
            }`}
            aria-label={readChapters.has(`${selectedBook}-${ch}`) ? `Chapter ${ch}, read` : `Chapter ${ch}`}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  )
}
