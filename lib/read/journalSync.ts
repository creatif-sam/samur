import { SupabaseClient } from '@supabase/supabase-js'
import { ensureSystemNotebook } from '@/lib/notes/data'

// Found by its fixed key, so renaming the notebook doesn't create a new one
export function ensureReadingLogsNotebook(supabase: SupabaseClient, userId: string): Promise<string> {
  return ensureSystemNotebook(supabase, userId, 'reading_logs')
}

export async function ensureBookSection(
  supabase: SupabaseClient,
  notebookId: string,
  bookTitle: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('sections')
    .select('id')
    .eq('notebook_id', notebookId)
    .eq('title', bookTitle)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('sections')
    .insert({ notebook_id: notebookId, title: bookTitle })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create book section')
  return data.id
}

export async function createReadingLogPage(
  supabase: SupabaseClient,
  sectionId: string,
  pagesRead: number,
  note: string | null
): Promise<void> {
  const today = new Date()
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const noteHtml = note ? `<p><strong>Note:</strong> ${note}</p>` : ''
  const content = `<p><strong>Pages read:</strong> ${pagesRead}</p>${noteHtml}`

  await supabase.from('pages').insert({
    section_id: sectionId,
    title: dateLabel,
    content,
  })
}
