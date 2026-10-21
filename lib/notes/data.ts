import type { SupabaseClient } from '@supabase/supabase-js'
import type { Notebook, Page } from '@/components/note/types'

// Lists only need titles and previews; a note's full content is fetched when it's opened.
// pages.is_pinned is exposed to the app as `pinned`.
export const PAGE_LIST_COLUMNS = 'id, section_id, title, preview, created_at, updated_at, pinned:is_pinned, shared'

type PageRow = Page & { is_pinned?: boolean | null }
const withPinned = (p: PageRow): Page => ({ ...p, pinned: p.pinned ?? !!p.is_pinned })

export function plainPreview(content: unknown) {
  return (typeof content === 'string' ? content : '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

export async function loadNotebooks(supabase: SupabaseClient, userId: string): Promise<Notebook[]> {
  const lean = await supabase
    .from('notebooks')
    .select(`*, sections (*, pages (${PAGE_LIST_COLUMNS}))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!lean.error) return (lean.data ?? []) as Notebook[]

  // Before the notes migration (no preview/pinned/shared columns): load everything
  const full = await supabase
    .from('notebooks')
    .select('*, sections (*, pages (*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (full.error) throw full.error
  return ((full.data ?? []) as Notebook[]).map(nb => ({
    ...nb,
    sections: (nb.sections ?? []).map(s => ({
      ...s,
      pages: (s.pages ?? []).map(p => ({ ...withPinned(p as PageRow), preview: p.preview ?? plainPreview(p.content) })),
    })),
  }))
}

export async function fetchPage(supabase: SupabaseClient, id: string): Promise<Page | null> {
  const { data, error } = await supabase.from('pages').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? withPinned(data as PageRow) : null
}

// Title or text contains the query, searched on the server (search_text is the
// note's plain text, kept by Postgres) so full notes aren't downloaded
export async function searchPages(supabase: SupabaseClient, query: string, sectionId?: string) {
  const q = query.trim().replace(/["\\]/g, '')
  if (!q) return []
  const run = (columns: string, filter: string) => {
    let req = supabase.from('pages').select(columns).or(filter).order('updated_at', { ascending: false, nullsFirst: false }).limit(60)
    if (sectionId) req = req.eq('section_id', sectionId)
    return req
  }
  const { data, error } = await run(PAGE_LIST_COLUMNS, `title.ilike."*${q}*",search_text.ilike."*${q}*"`)
  if (!error) return (data ?? []) as unknown as Page[]

  // Before the notes migration there's no search_text: match titles only
  const retry = await run('*', `title.ilike."*${q}*"`)
  if (retry.error) throw retry.error
  return ((retry.data ?? []) as unknown as PageRow[]).map(p => ({ ...withPinned(p), preview: plainPreview(p.content) }))
}

export type SystemNotebookKey = 'reading_logs' | 'bible_notes' | 'daily_journal' | 'prayer_inspirations' | 'prayer_diary' | 'general'

const SYSTEM_DEFAULTS: Record<SystemNotebookKey, { title: string; emoji: string; color: string }> = {
  reading_logs: { title: 'Reading Logs', emoji: '📚', color: '#7719AA' },
  bible_notes: { title: 'Bible Notes', emoji: '📖', color: '#7719aa' },
  daily_journal: { title: 'Daily Journaling', emoji: '📔', color: '#7719aa' },
  prayer_inspirations: { title: 'Prayer Inspirations', emoji: '🙏', color: '#7c3aed' },
  prayer_diary: { title: 'Prayer Diary', emoji: '📓', color: '#7c3aed' },
  general: { title: 'General', emoji: '📝', color: '#7719aa' },
}

// The notebook the app writes to automatically, found by its key so the user
// can rename it freely. Falls back to the old title match before the migration.
export async function ensureSystemNotebook(supabase: SupabaseClient, userId: string, key: SystemNotebookKey): Promise<string> {
  const defaults = SYSTEM_DEFAULTS[key]
  const byKey = await supabase.from('notebooks').select('id').eq('user_id', userId).eq('system_key', key).maybeSingle()
  const keysSupported = !byKey.error
  if (byKey.data) return byKey.data.id

  // Legacy notebook with the default title: adopt it
  const { data: byTitle } = await supabase
    .from('notebooks')
    .select('id')
    .eq('user_id', userId)
    .ilike('title', defaults.title)
    .order('created_at', { ascending: true })
    .limit(1)
  if (byTitle && byTitle.length > 0) {
    if (keysSupported) await supabase.from('notebooks').update({ system_key: key }).eq('id', byTitle[0].id)
    return byTitle[0].id
  }

  const { data, error } = await supabase
    .from('notebooks')
    .insert({ user_id: userId, ...defaults, ...(keysSupported ? { system_key: key } : {}) })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error(`Could not create ${defaults.title}`)
  return data.id
}

// The auto notebook's id if it exists (never creates one)
export async function findSystemNotebook(supabase: SupabaseClient, userId: string, key: SystemNotebookKey): Promise<string | null> {
  const byKey = await supabase.from('notebooks').select('id').eq('user_id', userId).eq('system_key', key).maybeSingle()
  if (byKey.data) return byKey.data.id
  const { data } = await supabase
    .from('notebooks')
    .select('id')
    .eq('user_id', userId)
    .ilike('title', SYSTEM_DEFAULTS[key].title)
    .order('created_at', { ascending: true })
    .limit(1)
  return data && data.length > 0 ? data[0].id : null
}

export async function ensureSection(supabase: SupabaseClient, notebookId: string, title: string): Promise<string> {
  const { data: existing } = await supabase
    .from('sections')
    .select('id')
    .eq('notebook_id', notebookId)
    .ilike('title', title)
    .limit(1)
  if (existing && existing.length > 0) return existing[0].id
  const { data, error } = await supabase.from('sections').insert({ notebook_id: notebookId, title }).select('id').single()
  if (error || !data) throw error ?? new Error('Could not create section')
  return data.id
}
