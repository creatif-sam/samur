'use client'

import type { RefObject, MutableRefObject } from 'react'
import {
  Loader2, ChevronLeft, ChevronRight, ChevronDown,
  Copy, Share2, Bookmark, Highlighter, PenLine, BookCopy, X,
} from 'lucide-react'
import {
  HIGHLIGHT_COLORS, displayBook, chapterArray, highlightBg,
  type Verse, type VerseHighlight,
} from './bibleConstants'

interface Props {
  readScrollRef: RefObject<HTMLDivElement | null>
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void
  loading: boolean
  error: string | null
  verses: Verse[]
  selectedBook: string
  selectedChapter: number
  highlights: Map<string, VerseHighlight>
  selectedVerses: Set<number>
  setSelectedVerses: (s: Set<number>) => void
  showHighlightPanel: boolean
  setShowHighlightPanel: (v: boolean | ((prev: boolean) => boolean)) => void
  fontSizeClass: string
  translation: string
  savedIds: Set<string>
  savingSelection: boolean
  formatRef: (nums: number[]) => string
  copySelectedVerses: () => void
  shareSelectedVerses: () => void
  saveSelectedVerses: () => void
  highlightSelectedVerses: (color: string | null) => void
  openNoteForSelection: () => void
  openCompare: () => void
  showChapterSheet: boolean
  setShowChapterSheet: (v: boolean | ((prev: boolean) => boolean)) => void
  setSelectedChapter: (ch: number) => void
  prevChapter: () => void
  nextChapter: () => void
}

export function BibleReadView({
  readScrollRef, handleTouchStart, handleTouchEnd,
  loading, error, verses,
  selectedBook, selectedChapter, highlights, selectedVerses, setSelectedVerses,
  showHighlightPanel, setShowHighlightPanel, fontSizeClass, translation,
  savedIds, savingSelection, formatRef,
  copySelectedVerses, shareSelectedVerses, saveSelectedVerses,
  highlightSelectedVerses, openNoteForSelection, openCompare,
  showChapterSheet, setShowChapterSheet, setSelectedChapter, prevChapter, nextChapter,
}: Props) {
  return (
    <>
      {/* ── Verse list ── */}
      <div
        ref={readScrollRef}
        className="px-4 pt-4 pb-6 space-y-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        )}
        {error && <div className="text-center py-10 text-destructive text-sm">{error}</div>}

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
                <p className={`flex-1 ${fontSizeClass} leading-[1.75] text-foreground`}>{v.text}</p>
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
            <div className="fixed bottom-[120px] left-0 right-0 z-[60] bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{refLabel}</p>
                  {selectedVerses.size > 1 && (
                    <span className="text-[11px] font-black text-violet-500 bg-violet-100 dark:bg-violet-900/40 px-2.5 py-1 rounded-full shrink-0">
                      {selectedVerses.size} verses
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedVerses(new Set()); setShowHighlightPanel(false) }}
                  className="p-1.5 rounded-xl hover:bg-muted transition shrink-0 ml-2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center px-2 py-3 gap-0.5 overflow-x-auto scrollbar-none">
                {[
                  { icon: <Copy className="w-5 h-5" />, label: 'Copy', action: copySelectedVerses },
                  { icon: <Share2 className="w-5 h-5" />, label: 'Share', action: shareSelectedVerses },
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action}
                    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]">
                    <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">{icon}</div>
                    <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
                  </button>
                ))}
                <button onClick={saveSelectedVerses} disabled={savingSelection}
                  className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${allSaved ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-muted'}`}>
                    {savingSelection
                      ? <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                      : <Bookmark className={`w-5 h-5 ${allSaved ? 'text-violet-600 dark:text-violet-400 fill-current' : ''}`} />}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{allSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button onClick={() => setShowHighlightPanel(v => !v)}
                  className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${sharedHighlight ? highlightBg(sharedHighlight.color) : 'bg-muted'}`}>
                    <Highlighter className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Highlight</span>
                </button>
                <button onClick={openNoteForSelection}
                  className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]">
                  <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Note</span>
                </button>
                <button onClick={openCompare}
                  className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl hover:bg-muted active:bg-muted/80 transition min-w-[60px]">
                  <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                    <BookCopy className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Compare</span>
                </button>
              </div>

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
                    <button onClick={() => highlightSelectedVerses(null)}
                      className="ml-auto p-2 rounded-xl hover:bg-muted transition">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
              <div className="h-3" />
            </div>
          )
        })()}
      </div>

      {/* ── Chapter nav bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-[56] bg-background/95 backdrop-blur border-t border-border flex items-center h-14 px-1">
        <button onClick={prevChapter} className="p-3 rounded-xl hover:bg-muted active:bg-muted transition" aria-label="Previous chapter">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowChapterSheet(v => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-muted active:bg-muted transition"
        >
          <span className="text-sm font-bold">{displayBook(selectedBook, translation)} {selectedChapter}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showChapterSheet ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={nextChapter} className="p-3 rounded-xl hover:bg-muted active:bg-muted transition" aria-label="Next chapter">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Chapter picker sheet ── */}
      {showChapterSheet && (
        <>
          <div className="fixed inset-0 z-[45] bg-black/20" onClick={() => setShowChapterSheet(false)} />
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
    </>
  )
}
