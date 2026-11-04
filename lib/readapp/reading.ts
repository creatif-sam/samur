import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReadingCategory, ReadingStatus } from '@/lib/types'
import { createReadingLogPage, ensureBookSection, ensureReadingLogsNotebook } from './journalSync'

export type { ReadingCategory, ReadingStatus }

export interface Reading {
  id: string
  title: string
  author?: string | null
  source?: string | null
  visibility?: 'private' | 'shared'
  status: ReadingStatus
  category: ReadingCategory
  total_pages: number
  pages_remaining: number
}

export const READING_COLUMNS = 'id, title, author, source, visibility, status, category, total_pages, pages_remaining'

export const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'to_read', label: 'To read' },
  { value: 'reading', label: 'Reading' },
  { value: 'done', label: 'Done' },
  { value: 'applied', label: 'Applied' },
]

export const CATEGORY_OPTIONS: { value: ReadingCategory; label: string }[] = [
  { value: 'faith', label: 'Faith' },
  { value: 'self_development', label: 'Self Development' },
  { value: 'skill', label: 'Skill' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
]

// Status after logging pages: starting a book moves it to Reading, finishing it to Done
export function statusAfterLog(status: ReadingStatus, pagesRemaining: number): ReadingStatus {
  if (pagesRemaining <= 0) return status === 'applied' ? 'applied' : 'done'
  return status === 'to_read' ? 'reading' : status
}

// A log must say what was read, so pages can't be counted without reading
export const MIN_READING_NOTE_CHARS = 20

export function readingNoteProblem(note: string | null | undefined): string | null {
  const text = (note ?? '').trim()
  if (!text) return 'Write a short note on what you read'
  if (text.length < MIN_READING_NOTE_CHARS) return `Say a bit more about what you read (at least ${MIN_READING_NOTE_CHARS} characters)`
  return null
}

// Logs pages for today (via the log_reading_pages RPC), keeps the status in step
// and mirrors the log into the Reading Logs notebook. Returns the new status.
export async function logReadingPages(
  supabase: SupabaseClient,
  reading: Reading,
  pages: number,
  note: string | null,
): Promise<ReadingStatus> {
  const problem = readingNoteProblem(note)
  if (problem) throw new Error(problem)
  const { error } = await supabase.rpc('log_reading_pages', {
    p_reading_id: reading.id,
    p_pages_read: pages,
    p_note: note!.trim(),
  })
  if (error) throw error

  const next = statusAfterLog(reading.status, reading.pages_remaining - pages)
  if (next !== reading.status) {
    const { error: statusError } = await supabase.from('readings').update({ status: next }).eq('id', reading.id)
    if (statusError) console.error('Failed to update reading status', statusError)
  }

  // Journal sync is best effort; it must never block logging
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const notebookId = await ensureReadingLogsNotebook(supabase, user.id)
      const sectionId = await ensureBookSection(supabase, notebookId, reading.title)
      await createReadingLogPage(supabase, sectionId, pages, note)
    }
  } catch {
    // ignore
  }

  return next
}

// Renames the book's section in the Reading Logs notebook after a title change
export async function renameBookSection(supabase: SupabaseClient, userId: string, oldTitle: string, newTitle: string) {
  if (oldTitle === newTitle) return
  try {
    const notebookId = await ensureReadingLogsNotebook(supabase, userId)
    await supabase.from('sections').update({ title: newTitle }).eq('notebook_id', notebookId).eq('title', oldTitle)
  } catch {
    // Best effort: a new section is created on the next log if this fails
  }
}
