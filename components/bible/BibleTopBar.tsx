'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  ChevronLeft, ChevronDown, Search, BookMarked, Type, X,
} from 'lucide-react'
import { TRANSLATIONS, displayBook, isFrench } from './bibleConstants'
import type { BibleView } from './useBibleReader'
import type { SearchHit } from '@/lib/bible/source'

interface Props {
  view: BibleView
  setView: Dispatch<SetStateAction<BibleView>>
  selectedBook: string
  selectedChapter: number
  translation: string
  selectedVerses: Set<number>
  setSelectedVerses: (s: Set<number>) => void
  setShowHighlightPanel: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  setSearchResults: (r: SearchHit[]) => void
  fontSize: 'sm' | 'md' | 'lg'
  fontSizeNext: { readonly sm: 'md'; readonly md: 'lg'; readonly lg: 'sm' }
  setFontSize: Dispatch<SetStateAction<'sm' | 'md' | 'lg'>>
  router: { back: () => void }
}

export function BibleTopBar({
  view, setView, selectedBook, selectedChapter, translation,
  selectedVerses, setSelectedVerses, setShowHighlightPanel,
  searchQuery, setSearchQuery, setSearchResults,
  fontSize, fontSizeNext, setFontSize,
  router,
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60 px-3 h-14 flex items-center gap-2">
      <button
        onClick={() => {
          if (view === 'read') setView('chapters')
          else if (view === 'chapters') setView('books')
          else if (view === 'saved' || view === 'search' || view === 'versions' || view === 'plans') setView('books')
          else if (view === 'compare') setView('read')
          else router.back()
        }}
        aria-label="Back"
        className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted active:scale-90 transition shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        {view === 'books' && (
          <div className="leading-tight">
            <h1 className="text-lg font-black tracking-tight">{isFrench(translation) ? 'Sainte Bible' : 'Holy Bible'}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              {TRANSLATIONS.find(t => t.id === translation)?.name ?? 'King James Version'}
            </p>
          </div>
        )}
        {view === 'chapters' && (
          <p className="text-base font-black uppercase tracking-tight truncate">
            {displayBook(selectedBook, translation)}
          </p>
        )}
        {view === 'read' && (
          <p className="text-base font-black uppercase tracking-tight truncate">
            {displayBook(selectedBook, translation)}{' '}
            <span className="text-violet-500">{selectedChapter}</span>
          </p>
        )}
        {view === 'versions' && <p className="text-base font-bold">Versions</p>}
        {view === 'compare' && <p className="text-base font-bold">Compare Versions</p>}
        {view === 'saved' && <p className="text-base font-black uppercase tracking-tight">Saved Verses</p>}
        {view === 'plans' && <p className="text-base font-black uppercase tracking-tight">Reading Plans</p>}
        {view === 'search' && (
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Passage (John 3:16) or words"
            className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {view === 'read' && selectedVerses.size > 0 && (
          <button
            onClick={() => { setSelectedVerses(new Set()); setShowHighlightPanel(false) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-black transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        {view !== 'books' && view !== 'search' && view !== 'compare' && (
          <>
            {view === 'read' && selectedVerses.size === 0 && (
              <button
                onClick={() => setFontSize(fontSizeNext[fontSize])}
                title={`Font: ${fontSize.toUpperCase()}`}
                className="p-1.5 rounded-xl hover:bg-muted transition relative"
              >
                <Type className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-black text-violet-500 leading-none">
                  {fontSize.toUpperCase()}
                </span>
              </button>
            )}
            <button onClick={() => setView('search')} className="p-1.5 rounded-xl hover:bg-muted transition">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setView(v => v === 'versions' ? 'books' : 'versions')}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] font-black uppercase tracking-wide transition ${
                view === 'versions'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                  : 'hover:bg-muted text-muted-foreground'
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
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]) }}
            className="p-1.5 rounded-xl hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  )
}
