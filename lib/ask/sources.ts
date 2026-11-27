import type { SupabaseClient } from '@supabase/supabase-js'
import { appLocale, trNow } from '@/lib/i18n'
import { parseDateKey } from '@/lib/dates'
import { parsePost, kindInfo } from '@/lib/posts'
import { loadLifeStatement } from '@/lib/lifeStatement'
import type { AskDoc } from '@/lib/ask/search'

// Everything you've written, gathered for "Ask Mastery". Only your own entries (row
// security keeps it that way). Each source loads on its own: one that fails or isn't
// set up yet is skipped, and the rest still answer.

export const stripHtml = (html: unknown) =>
  (typeof html === 'string' ? html : '')
    .replace(/<\/(p|div|li|h\d|blockquote)>/gi, '. ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s*\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim()

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join('. ')
const longDate = (key: string) => parseDateKey(key).toLocaleDateString(appLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

type Loader = (supabase: SupabaseClient, uid: string) => Promise<AskDoc[]>
type Row = Record<string, unknown>
const s = (v: unknown) => (typeof v === 'string' ? v : '')

const notes: Loader = async (supabase, uid) => {
  const pick = (cols: string) => supabase.from('notebooks').select(`title, sections (title, pages (${cols}))`).eq('user_id', uid)
  let { data, error } = await pick('id, title, search_text, created_at, updated_at')
  // Before the notes migration there is no plain-text column: read the full notes
  if (error) ({ data, error } = await pick('id, title, content, created_at, updated_at'))
  if (error) throw error
  const out: AskDoc[] = []
  for (const nb of (data ?? []) as unknown as Row[]) {
    for (const sec of (nb.sections ?? []) as Row[]) {
      for (const p of (sec.pages ?? []) as Row[]) {
        out.push({
          id: `note-${p.id}`,
          kind: 'note',
          title: s(p.title) || trNow('Untitled'),
          text: s(p.search_text) || stripHtml(p.content),
          date: day(s(p.updated_at) || s(p.created_at)),
          href: `/protected/note?page=${p.id}`,
          where: `${s(nb.title)} › ${s(sec.title)}`,
        })
      }
    }
  }
  return out
}

const posts: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('posts').select('id, content, created_at').eq('author_id', uid).order('created_at', { ascending: false }).limit(2000)
  if (error) throw error
  return ((data ?? []) as Row[]).filter(p => s(p.content).trim()).map(p => {
    const { kind, body } = parsePost(s(p.content))
    const info = kindInfo(kind)
    return {
      id: `post-${p.id}`, kind: 'post' as const,
      title: info ? `${info.emoji} ${trNow(info.label)}` : trNow('Journal post'),
      text: body, date: day(s(p.created_at)), href: '/protected/posts?tab=posts',
    }
  })
}

const gratitude: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('gratitude_entries').select('id, date, entry_1, entry_2, entry_3').eq('user_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(g => ({
    id: `gratitude-${g.id}`, kind: 'gratitude' as const, title: trNow('Gratitude'),
    text: join(s(g.entry_1), s(g.entry_2), s(g.entry_3)), date: day(s(g.date)), href: '/protected',
  })).filter(d => d.text)
}

const meditations: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('meditations').select('id, title, scripture, lesson, application, prayer, created_at').eq('author_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(m => ({
    id: `meditation-${m.id}`, kind: 'meditation' as const,
    title: s(m.title) || trNow('Meditation'),
    text: join(s(m.scripture), stripHtml(m.lesson), s(m.application), s(m.prayer)),
    date: day(s(m.created_at)), href: `/protected/meditations/${m.id}`,
  }))
}

// One entry per planner day: the morning intention, the evening reflection and the events
const days: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('planner_days').select('day, morning, reflection, tasks').eq('user_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(r => {
    const events = Array.isArray(r.tasks) ? (r.tasks as Row[]).map(t => s(t?.text)).filter(Boolean) : []
    const text = join(
      s(r.morning) && `${trNow('Morning Intention')}: ${s(r.morning)}`,
      s(r.reflection) && `${trNow('Evening Reflection')}: ${s(r.reflection)}`,
      events.length > 0 && `${trNow('Events')}: ${events.join(', ')}`,
    )
    const key = s(r.day)
    return { id: `day-${key}`, kind: 'day' as const, title: longDate(key), text, date: key, href: `/protected/planner/day?date=${key}` }
  }).filter(d => d.text)
}

const todos: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('planner_todos').select('id, text, created_at').eq('user_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(t => ({
    id: `todo-${t.id}`, kind: 'todo' as const, title: s(t.text), text: '', date: day(s(t.created_at)), href: '/protected/planner/day',
  })).filter(d => d.title)
}

const prayers: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('prayer_requests').select('*').eq('user_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(p => ({
    id: `prayer-${p.id}`, kind: 'prayer' as const, title: s(p.title),
    text: join(
      s(p.description),
      s(p.verse_ref) && `${s(p.verse_text)} (${s(p.verse_ref)})`,
      p.status === 'answered' && `${trNow('Answered')}${s(p.answer_note) ? `: ${s(p.answer_note)}` : ''}`,
    ),
    date: day(s(p.answered_at) || s(p.created_at)), href: '/protected/posts?tab=prayer',
  }))
}

const goals: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('goals').select('id, title, description, deliverable, status, created_at').eq('owner_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(g => ({
    id: `goal-${g.id}`, kind: 'goal' as const, title: s(g.title),
    text: join(s(g.description), s(g.deliverable)), date: day(s(g.created_at)), href: '/protected/goals?tab=goals',
  }))
}

const roles: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('roles').select('id, name, mission, vision, created_at').eq('owner_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(r => ({
    id: `role-${r.id}`, kind: 'role' as const, title: s(r.name),
    text: join(s(r.mission), s(r.vision)), date: day(s(r.created_at)), href: '/protected/goals?tab=roles',
  }))
}

const rocks: Loader = async (supabase, uid) => {
  const { data, error } = await supabase.from('weekly_rocks').select('id, text, week_start').eq('owner_id', uid)
  if (error) throw error
  return ((data ?? []) as Row[]).map(r => ({
    id: `rock-${r.id}`, kind: 'rock' as const, title: s(r.text), text: '', date: s(r.week_start) || null, href: '/protected/goals?tab=week',
  }))
}

const life: Loader = async (supabase, uid) => {
  const { life } = await loadLifeStatement(supabase, uid)
  const out: AskDoc[] = []
  if (life.mission) out.push({ id: 'life-mission', kind: 'life', title: trNow('Life mission'), text: life.mission, date: day(life.updatedAt), href: '/protected/goals' })
  if (life.vision) out.push({ id: 'life-vision', kind: 'life', title: trNow('Life vision'), text: life.vision, date: day(life.updatedAt), href: '/protected/goals' })
  return out
}

const LOADERS = [notes, posts, gratitude, meditations, days, todos, prayers, goals, roles, rocks, life]

export async function loadCorpus(supabase: SupabaseClient, uid: string): Promise<AskDoc[]> {
  const parts = await Promise.all(LOADERS.map(load => load(supabase, uid).catch(err => {
    console.warn('Ask: a source was skipped', err?.message ?? err)
    return [] as AskDoc[]
  })))
  return parts.flat()
}
