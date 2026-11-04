'use client'

import Link from 'next/link'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { displayBook, type Verse } from './bibleConstants'

interface Props {
  noteVerse: Verse
  noteContent: string
  setNoteContent: (c: string) => void
  noteRef: string
  noteIsMulti: boolean
  savingNote: boolean
  // The note this verse already has; text is null while loading
  existing: { pageId: string; title: string; text: string | null } | null
  selectedBook: string
  selectedChapter: number
  translation: string
  onClose: () => void
  onSave: () => void
}

export function BibleNoteModal({
  noteVerse, noteContent, setNoteContent, noteRef, noteIsMulti,
  savingNote, existing, selectedBook, selectedChapter, translation, onClose, onSave,
}: Props) {
  return (
    // z-[60] sits above the fixed bottom nav bar
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
      <div className="w-full max-w-lg bg-background rounded-3xl border border-border shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-200 max-h-[85dvh] overflow-y-auto overscroll-contain">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-0.5">
              {existing ? 'Your Note' : 'Add Bible Note'}
            </p>
            <p className="font-black text-base">
              {existing?.title || noteRef || `${displayBook(selectedBook, translation)} ${selectedChapter}:${noteVerse.verse}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {existing && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 p-3.5 space-y-2">
            {existing.text === null ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your note…
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto overscroll-contain">
                {existing.text || <span className="italic text-muted-foreground">This note is empty.</span>}
              </p>
            )}
            <Link
              href={`/protected/note?page=${existing.pageId}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400"
            >
              <ExternalLink className="w-3 h-3" /> Open in Notes
            </Link>
          </div>
        )}

        {!noteIsMulti && !existing && (
          <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-violet-400 pl-3">
            &ldquo;{noteVerse.text.trim()}&rdquo;
          </p>
        )}

        <textarea
          autoFocus={!existing}
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder={existing
            ? (noteRef ? `Add your thoughts on ${noteRef} to this note…` : 'Add to this note…')
            : noteIsMulti ? 'Add your thoughts about these verses...' : 'Add your thoughts, reflections...'}
          rows={noteIsMulti ? 5 : 4}
          className="w-full bg-muted/50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={savingNote}
            className="flex-1 py-3 rounded-2xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : existing ? 'Add to Note' : 'Save Note'}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {existing ? <>Added to the end of this note, with today&apos;s date</> : <>Saved to <span className="font-bold">Bible Notes</span>{' '}
          →{' '}
          <span className="font-bold">{displayBook(selectedBook, translation)}</span></>}
        </p>
      </div>
    </div>
  )
}
