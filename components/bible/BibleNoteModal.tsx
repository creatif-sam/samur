'use client'

import { Loader2, X } from 'lucide-react'
import { displayBook, type Verse } from './bibleConstants'

interface Props {
  noteVerse: Verse
  noteContent: string
  setNoteContent: (c: string) => void
  noteRef: string
  noteIsMulti: boolean
  savingNote: boolean
  selectedBook: string
  selectedChapter: number
  translation: string
  onClose: () => void
  onSave: () => void
}

export function BibleNoteModal({
  noteVerse, noteContent, setNoteContent, noteRef, noteIsMulti,
  savingNote, selectedBook, selectedChapter, translation, onClose, onSave,
}: Props) {
  return (
    // pb-24 gives 96px bottom clearance so the modal sits above the fixed bottom nav bar
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm pt-4 px-4 pb-24 sm:p-4">
      <div className="w-full max-w-lg bg-background rounded-3xl border border-border shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-200 max-h-[80dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-0.5">
              Add Bible Note
            </p>
            <p className="font-black text-base">
              {noteRef || `${displayBook(selectedBook, translation)} ${selectedChapter}:${noteVerse.verse}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition shrink-0">
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
            {savingNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Note'}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Saved to <span className="font-bold">Bible Notes</span>{' '}
          →{' '}
          <span className="font-bold">{displayBook(selectedBook, translation)}</span>
        </p>
      </div>
    </div>
  )
}
