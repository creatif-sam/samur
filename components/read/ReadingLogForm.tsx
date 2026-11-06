'use client'

import { JSX, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MIN_READING_NOTE_CHARS, logReadingPages, readingNoteProblem,
  type Reading, type ReadingStatus,
} from '@/lib/read/reading'
import {
  loadLogMode, loadNoteDraft, pagesFromInput, saveLogMode, saveNoteDraft, type LogMode,
} from '@/lib/read/drafts'

interface Props {
  book: Reading
  onLogged: (next: ReadingStatus) => void
}

// Logging today's reading: what you read (required) and how far you got,
// as a page count or the page you stopped on. The note is kept as a draft.
export default function ReadingLogForm({ book, onLogged }: Props): JSX.Element {
  const [note, setNote] = useState('')
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<LogMode>('pages')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNote(loadNoteDraft(book.id))
    setMode(loadLogMode())
  }, [book.id])

  const alreadyRead = book.total_pages - book.pages_remaining
  const pages = pagesFromInput(mode, input, alreadyRead)
  const noteProblem = readingNoteProblem(note)
  const noteLeft = MIN_READING_NOTE_CHARS - note.trim().length

  const pagesProblem = !input
    ? null
    : mode === 'at' && pages <= 0
    ? `You were already on page ${alreadyRead}`
    : pages <= 0
    ? 'Enter how many pages you read'
    : pages > book.pages_remaining
    ? `Only ${book.pages_remaining} pages left (book has ${book.total_pages})`
    : null

  function changeNote(text: string) {
    setNote(text)
    saveNoteDraft(book.id, text)
  }

  function changeMode(next: LogMode) {
    setMode(next)
    saveLogMode(next)
    setInput('')
  }

  async function submit() {
    if (noteProblem) { toast.error(noteProblem); return }
    if (!input || pagesProblem) { toast.error(pagesProblem ?? 'Enter your pages'); return }
    setSaving(true)
    try {
      const next = await logReadingPages(createClient(), book, pages, note.trim())
      saveNoteDraft(book.id, '')
      setNote('')
      setInput('')
      toast.success(next === 'done' ? `Finished ${book.title}! 🎉` : `Logged ${pages} page${pages !== 1 ? 's' : ''} 📚`)
      onLogged(next)
    } catch (err) {
      console.error('Logging reading failed', err)
      toast.error(err instanceof Error && err.message ? err.message : 'Failed to log reading')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => changeNote(e.target.value)}
        rows={2}
        placeholder="What did you read? A key idea or takeaway"
        className="w-full rounded-xl bg-muted/60 px-3 py-2 text-[15px] leading-snug resize-none outline-none focus:ring-2 focus:ring-violet-500"
      />
      {note.trim().length > 0 && noteLeft > 0 && (
        <p className="text-[10px] text-muted-foreground -mt-1">{noteLeft} more character{noteLeft !== 1 ? 's' : ''}</p>
      )}

      <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-0.5 w-fit">
        {([['pages', 'Pages read'], ['at', "I'm on page"]] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => changeMode(m)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'at' ? `Page you stopped on (was ${alreadyRead})` : 'Pages read today'}
          className="flex-1 min-w-0 rounded-xl bg-muted/60 px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={saving || !input || !!pagesProblem || !!noteProblem}
          className="shrink-0 rounded-xl bg-violet-600 text-white px-4 text-sm font-bold disabled:opacity-40 active:scale-95 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Log
        </button>
      </div>
      {input && (
        <p className={`text-[10px] -mt-1 ${pagesProblem ? 'text-red-500' : 'text-muted-foreground'}`}>
          {pagesProblem ?? (mode === 'at' ? `= ${pages} page${pages !== 1 ? 's' : ''} today` : `Now on page ${alreadyRead + pages} of ${book.total_pages}`)}
        </p>
      )}
    </form>
  )
}
