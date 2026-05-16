import { SupabaseClient } from '@supabase/supabase-js'

const NOTEBOOK_TITLE = 'Reading Logs'
const NOTEBOOK_EMOJI = '📚'
const NOTEBOOK_COLOR = '#7719AA'

export async function ensureReadingLogsNotebook(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('notebooks')
    .select('id')
    .eq('user_id', userId)
    .eq('title', NOTEBOOK_TITLE)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('notebooks')
    .insert({ user_id: userId, title: NOTEBOOK_TITLE, emoji: NOTEBOOK_EMOJI, color: NOTEBOOK_COLOR })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create Reading Logs notebook')
  return data.id
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
