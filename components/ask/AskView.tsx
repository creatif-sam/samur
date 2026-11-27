'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, Compass, Heart, Loader2, NotebookPen, Search, Sparkles, X } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { createClient } from '@/lib/supabase/client'
import { appLocale } from '@/lib/i18n'
import { parseDateKey } from '@/lib/dates'
import { buildIndex, search, type AskDoc, type AskHit, type AskIndex, type DocKind, type Segment } from '@/lib/ask/search'
import { loadCorpus } from '@/lib/ask/sources'

// Ask Mastery: find anything you've written by asking in plain words. Searches on this
// device over your own notes, journal, prayer, Compass and planner; nothing is sent away.

type Filter = 'all' | 'notes' | 'journal' | 'prayer' | 'compass' | 'planner'
const FILTERS: { id: Filter; label: string; kinds: DocKind[] | null; icon: typeof Search }[] = [
  { id: 'all', label: 'All', kinds: null, icon: Search },
  { id: 'notes', label: 'Notes', kinds: ['note'], icon: BookOpen },
  { id: 'journal', label: 'Journal', kinds: ['post', 'gratitude', 'meditation', 'day'], icon: NotebookPen },
  { id: 'prayer', label: 'Prayer', kinds: ['prayer'], icon: Heart },
  { id: 'compass', label: 'Compass', kinds: ['goal', 'role', 'rock', 'life'], icon: Compass },
  { id: 'planner', label: 'Planner', kinds: ['day', 'todo'], icon: CalendarDays },
]

const KIND_LABEL: Record<DocKind, string> = {
  note: 'Note', post: 'Journal post', gratitude: 'Gratitude', meditation: 'Meditation', day: 'Planner day', todo: 'To-do',
  prayer: 'Prayer request', goal: 'Goal', role: 'Role', rock: 'Big rock', life: 'Mission & vision',
}
const KIND_COLOR: Record<DocKind, string> = {
  note: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  post: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  gratitude: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  meditation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  day: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  prayer: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  goal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  role: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  rock: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
  life: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
}

const EXAMPLES = [
  'What did I pray about last month?',
  'When was I grateful for my family?',
  'My goals for this year',
  'What did I write about patience?',
]

function Marked({ parts }: { parts: Segment[] }) {
  return (
    <>
      {parts.map((p, i) => p.hit
        ? <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30">{p.text}</mark>
        : <span key={i}>{p.text}</span>)}
    </>
  )
}

// `initialDocs` (previews) skips reading from the database
export default function AskView({ initialDocs }: { initialDocs?: AskDoc[] }) {
  const { tr } = useTranslation()
  const router = useRouter()
  const [index, setIndex] = useState<AskIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [ignoreDates, setIgnoreDates] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialDocs) { setIndex(buildIndex(initialDocs)); return }
    let live = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      try {
        const docs = await loadCorpus(supabase, user.id)
        if (live) setIndex(buildIndex(docs))
      } catch {
        if (live) setFailed(true)
      }
    })()
    return () => { live = false }
  }, [router, initialDocs])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => { setIgnoreDates(false) }, [debounced])

  const kinds = FILTERS.find(f => f.id === filter)?.kinds ?? null
  const result = useMemo(() => {
    if (!index || debounced.trim().length < 2) return null
    // The date chip can be removed: the same words over every date
    return search(index, debounced, { kinds, ignoreDates })
  }, [index, debounced, kinds, ignoreDates])

  const rangeLabel = (label: string) => {
    if (/^\d{4}-\d{2}$/.test(label)) return parseDateKey(`${label}-01`).toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' })
    return tr({ today: 'Today', yesterday: 'Yesterday', 'last week': 'Last week', 'this week': 'This week', 'last month': 'Last month', 'this month': 'This month', 'last year': 'Last year', 'this year': 'This year' }[label] ?? label)
  }
  const fmt = (key: string | null) => (key ? parseDateKey(key).toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '')

  const ask = (q: string) => { setQuery(q); setDebounced(q); inputRef.current?.focus() }
  const top: AskHit | undefined = result?.hits[0]
  const rest = result?.hits.slice(1) ?? []

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header and question */}
      <div className="sticky top-[56px] z-20 space-y-3 border-b border-border/40 bg-background/95 px-4 pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} aria-label={tr('Back')} className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h1 className="text-base font-black">{tr('Ask Mastery')}</h1>
          <HelpTip topic="ask.page" align="left" className="-my-1" />
        </div>
        <form onSubmit={e => { e.preventDefault(); setDebounced(query) }} className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 focus-within:border-violet-400">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            enterKeyHint="search"
            maxLength={200}
            placeholder={tr('Ask about your notes, prayers, goals…')}
            aria-label={tr('Your question')}
            className="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setDebounced(''); inputRef.current?.focus() }} aria-label={tr('Clear')} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === f.id ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'}`}
            >
              <f.icon className="h-3.5 w-3.5" /> {tr(f.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {failed ? (
          <p className="rounded-2xl border border-dashed border-red-300 p-6 text-center text-sm text-muted-foreground">{tr('Couldn\'t read your content. Check your connection and try again.')}</p>
        ) : !index ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            {tr('Reading your notes, journal, prayers and plans…')}
          </div>
        ) : !result ? (
          <>
            <p className="text-xs text-muted-foreground">
              {tr('{n} {n:entry|entries} ready to search. Searching happens on this device; nothing is sent anywhere.', { n: index.docs.length })}
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tr('Try asking')}</p>
              {EXAMPLES.map(e => (
                <button key={e} onClick={() => ask(tr(e))} className="flex w-full items-center justify-between rounded-2xl border bg-card px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99]">
                  {tr(e)} <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* What was understood */}
            {(result.range || result.kinds.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                {result.range && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 py-0.5 pl-2.5 pr-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <CalendarDays className="h-3 w-3" /> {rangeLabel(result.range.label)}
                    <button onClick={() => setIgnoreDates(true)} aria-label={tr('Search all dates')} className="grid h-5 w-5 place-items-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/25">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {result.kinds.length > 0 && filter === 'all' && <span>{tr('Looking first at: {kinds}', { kinds: result.kinds.map(k => tr(KIND_LABEL[k])).join(', ') })}</span>}
              </div>
            )}

            {!top ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="text-sm font-semibold">{tr('Nothing found for that.')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tr('Try other words, fewer words, or another period.')}</p>
              </div>
            ) : (
              <>
                {/* The best match, as the answer */}
                <Link href={top.doc.href} className="block rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-sm transition active:scale-[0.99]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{tr('Best match')}</p>
                  <p className="mt-2 font-serif text-lg leading-snug">
                    “<Marked parts={top.snippet.length ? top.snippet : [{ text: top.doc.title, hit: false }]} />”
                  </p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 font-bold">{tr(KIND_LABEL[top.doc.kind])}</span>
                    <span className="font-semibold text-white">{top.doc.title}</span>
                    {top.doc.date && <span>· {fmt(top.doc.date)}</span>}
                  </p>
                  {top.doc.where && <p className="mt-1 text-[11px] text-white/60">{top.doc.where}</p>}
                  <p className="mt-3 flex items-center gap-1 text-xs font-bold">{tr('Open entry')} <ArrowRight className="h-3.5 w-3.5" /></p>
                </Link>

                {rest.length > 0 && (
                  <p className="pt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {tr('{n} more {n:result|results}', { n: rest.length })}
                  </p>
                )}
                <ul className="space-y-2">
                  {rest.map(h => (
                    <li key={h.doc.id}>
                      <Link href={h.doc.href} className="block rounded-2xl border bg-card p-3.5 transition active:scale-[0.99]">
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${KIND_COLOR[h.doc.kind]}`}>{tr(KIND_LABEL[h.doc.kind])}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">{h.doc.title}</span>
                          {h.doc.date && <span className="shrink-0 text-[11px] text-muted-foreground">{fmt(h.doc.date)}</span>}
                        </div>
                        {h.snippet.length > 0 && h.doc.text && (
                          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground"><Marked parts={h.snippet} /></p>
                        )}
                        {h.doc.where && <p className="mt-1 truncate text-[10px] text-muted-foreground/80">{h.doc.where}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
