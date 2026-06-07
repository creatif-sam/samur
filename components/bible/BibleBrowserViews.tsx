'use client'

import type { Dispatch, SetStateAction } from 'react'
import { ChevronRight, Check, Globe, Search, BookMarked, X, Loader2 } from 'lucide-react'
import { TRANSLATIONS, displayBook, chapterArray, type SavedVerse, isFrench } from './bibleConstants'
import type { BibleView } from './useBibleReader'

// ── Search View ───────────────────────────────────────────────────────────
interface SearchProps {
  searching: boolean
  searchQuery: string
  searchResults: any[]
}

export function BibleSearchView({ searching, searchQuery, searchResults }: SearchProps) {
  return (
    <div className="px-4 pt-4 space-y-2">
      {searching && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      )}
      {!searching && searchQuery && searchResults.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">
          No results. Try a reference like "John 3:16".
        </p>
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
  )
}

// ── Saved Verses View ─────────────────────────────────────────────────────
interface SavedProps { savedVerses: SavedVerse[] }

export function BibleSavedView({ savedVerses }: SavedProps) {
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
        <div key={v.id} className="rounded-2xl bg-card border border-border p-4 space-y-1">
          <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
            {v.book} {v.chapter}:{v.verse}
          </p>
          <p className="text-sm text-foreground leading-relaxed italic">"{v.text}"</p>
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
  )
}

// ── Book Browser ──────────────────────────────────────────────────────────
interface BookBrowserProps {
  bookSearch: string
  setBookSearch: (q: string) => void
  showRecent: boolean
  bookSort: 'canonical' | 'alpha'
  displayedBooks: string[]
  openBook: (book: string) => void
  translation: string
}

export function BibleBookBrowser({
  bookSearch, setBookSearch, showRecent, bookSort, displayedBooks, openBook, translation,
}: BookBrowserProps) {
  return (
    <div className="pb-10">
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
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chapter Browser ───────────────────────────────────────────────────────
interface ChapterBrowserProps {
  selectedBook: string
  selectedChapter: number
  openChapter: (ch: number) => void
  translation: string
}

export function BibleChapterBrowser({ selectedBook, selectedChapter, openChapter, translation }: ChapterBrowserProps) {
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
                : 'bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  )
}
