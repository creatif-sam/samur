'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import MeditationStreakBoard, { computeStreaks, groupByDay } from '@/components/meditations/MeditationStreakBoard'
import PartnerMeditationBoard from '@/components/meditations/PartnerMeditationBoard'
import MemoryVerseCard from '@/components/meditations/MemoryVerseCard'
import {
  BookOpen, Check, ChevronRight, Clock, Copy, Flame, Lock, Moon, PenLine, Search, Sun, Users, X,
} from 'lucide-react'
import { toLocalDateKey } from '@/lib/dates'
import type { MeditationDB } from '@/lib/types'

type Filter = 'all' | 'mine' | 'partner' | 'private' | 'shared'

const plain = (s: string | null | undefined) => (s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export default function MeditationsTab() {
  const [meditations, setMeditations] = useState<MeditationDB[]>([])
  const [loaded, setLoaded] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null)
  const [editing, setEditing] = useState<MeditationDB | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [verseVersion, setVerseVersion] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  // The time of day only exists in the browser (the server's clock and time zone differ)
  const [clock, setClock] = useState<Date | null>(null)

  useEffect(() => {
    loadMeditations()
    setClock(new Date())
    const timer = setInterval(() => setClock(new Date()), 5 * 60_000)
    return () => clearInterval(timer)
  }, [])

  async function loadMeditations() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setLoaded(true); return }
    setUserId(auth.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at, partner_id')
      .eq('id', auth.user.id)
      .single()

    if (profile?.created_at) setAccountCreatedAt(profile.created_at)

    let query = supabase
      .from('meditations')
      .select('id, author_id, title, scripture, lesson, application, prayer, visibility, period, created_at')

    if (profile?.partner_id) {
      query = query.or(`author_id.eq.${auth.user.id},and(author_id.eq.${profile.partner_id},visibility.eq.shared)`)
      supabase.from('profiles').select('name').eq('id', profile.partner_id).maybeSingle()
        .then(({ data }) => setPartnerName(data?.name?.split(' ')[0] || 'Partner'))
    } else {
      query = query.eq('author_id', auth.user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    setLoaded(true)
    if (error) { console.error(error); return }
    setMeditations(data as MeditationDB[])
  }

  const own = useMemo(() => meditations.filter(m => m.author_id === userId), [meditations, userId])

  // ── Today ──
  const now = clock ?? new Date(0)
  const hour = now.getHours()
  const currentPeriod: 'morning' | 'evening' = hour < 12 ? 'morning' : 'evening'
  const greeting = hour < 5 ? 'Peaceful night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayKey = toLocalDateKey(now)
  const todays = own.filter(m => toLocalDateKey(new Date(m.created_at)) === todayKey)
  const morningDone = todays.some(m => m.period === 'morning')
  const eveningDone = todays.some(m => m.period === 'evening')
  const streak = useMemo(() => computeStreaks(groupByDay(own)).current, [own])

  const heroTitle = !clock
    ? 'Your meditations'
    : morningDone && eveningDone
    ? 'Both meditations done today'
    : hour < 5
    ? 'Take a quiet moment with God'
    : currentPeriod === 'morning'
    ? (morningDone ? 'Morning meditation done' : 'Begin your day in the Word')
    : (eveningDone ? 'Evening meditation done' : morningDone ? 'Close your day with reflection' : 'Take a quiet moment with God')
  const heroAction = (currentPeriod === 'morning' ? morningDone : eveningDone)
    ? 'Write another'
    : `Write ${currentPeriod} meditation`

  // ── Rhythm ──
  const rhythm = useMemo(() => {
    if (own.length < 3) return null
    const hourCounts = new Array<number>(24).fill(0)
    let mornings = 0
    own.forEach(m => {
      hourCounts[new Date(m.created_at).getHours()] += 1
      if (m.period === 'morning') mornings++
    })
    const bestHour = hourCounts.indexOf(Math.max(...hourCounts))
    const monthKey = todayKey.slice(0, 7)
    return {
      time: new Date(2000, 0, 1, bestHour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      period: mornings >= own.length - mornings ? `Mornings · ${Math.round((mornings / own.length) * 100)}%` : `Evenings · ${Math.round(((own.length - mornings) / own.length) * 100)}%`,
      thisMonth: own.filter(m => toLocalDateKey(new Date(m.created_at)).startsWith(monthKey)).length,
    }
  }, [own, todayKey])

  // ── Journal ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return meditations.filter(m => {
      const mine = m.author_id === userId
      if (filter === 'mine' && !mine) return false
      if (filter === 'partner' && mine) return false
      if ((filter === 'private' || filter === 'shared') && (!mine || m.visibility !== filter)) return false
      if (!q) return true
      return [m.title, m.scripture, plain(m.lesson), plain(m.application), plain(m.prayer)].some(t => (t ?? '').toLowerCase().includes(q))
    })
  }, [meditations, search, filter, userId])

  const byMonth = useMemo(() => {
    const groups: { label: string; items: MeditationDB[] }[] = []
    for (const m of filtered) {
      const label = new Date(m.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      const last = groups[groups.length - 1]
      if (last?.label === label) last.items.push(m)
      else groups.push({ label, items: [m] })
    }
    return groups
  }, [filtered])

  const hasPartnerEntries = meditations.some(m => m.author_id !== userId)
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Mine' },
    ...(hasPartnerEntries ? [{ value: 'partner' as const, label: partnerName ?? 'Partner' }] : []),
    { value: 'shared', label: 'Shared' },
    { value: 'private', label: 'Private' },
  ]

  async function copyMeditation(m: MeditationDB) {
    const text = [m.title, m.scripture, plain(m.lesson), plain(m.application), plain(m.prayer)].filter(Boolean).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(id => (id === m.id ? null : id)), 1500)
      toast.success('Meditation copied')
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <div className="space-y-5 pb-10">
      {/* ── Today ── */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-500/20">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl" aria-hidden />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                {clock ? <>{greeting} · {clock.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</> : ' '}
              </p>
              <h2 className="mt-1.5 text-[22px] font-black leading-tight tracking-tight">{heroTitle}</h2>
            </div>
            {streak > 0 && (
              <div className="shrink-0 flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
                <Flame className="h-4 w-4 fill-orange-300 text-orange-300" />
                <span className="text-lg font-black leading-none mt-0.5">{streak}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">day{streak !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {([['morning', 'Morning', Sun, morningDone], ['evening', 'Evening', Moon, eveningDone]] as const).map(([key, label, Icon, done]) => (
              <span
                key={key}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  done ? 'bg-white text-violet-700' : 'bg-white/15 text-white/85'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing({} as MeditationDB)}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-violet-700 shadow-sm active:scale-[0.98] transition"
            >
              <PenLine className="h-4 w-4" /> {heroAction}
            </button>
            <Link
              href="/protected/bible"
              aria-label="Open the Bible"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-4 text-sm font-bold active:scale-[0.98] transition"
            >
              <BookOpen className="h-4 w-4" /> Bible
            </Link>
          </div>
        </div>
      </section>

      {/* ── This week ── */}
      {userId && accountCreatedAt && (
        <MeditationStreakBoard meditations={meditations} ownerId={userId} accountCreatedAt={accountCreatedAt} />
      )}

      {/* ── Memory verse (refreshes after a meditation sets one) ── */}
      <MemoryVerseCard key={verseVersion} />

      {/* ── Partner ── */}
      <PartnerMeditationBoard />

      {/* ── Rhythm ── */}
      {rhythm && (
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock, label: 'Usual time', value: rhythm.time, tone: 'text-violet-600 dark:text-violet-400' },
            { icon: Sun, label: 'You prefer', value: rhythm.period, tone: 'text-amber-600 dark:text-amber-400' },
            { icon: PenLine, label: 'This month', value: `${rhythm.thisMonth} written`, tone: 'text-indigo-600 dark:text-indigo-400' },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="rounded-2xl border border-border bg-card px-3 py-2.5 min-w-0">
              <Icon className={`h-3.5 w-3.5 ${tone}`} />
              <p className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-xs font-bold truncate">{value}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Journal ── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-center gap-0.5">
            <h3 className="text-base font-black tracking-tight">Your journal</h3>
            <HelpTip topic="spirit.journal" align="left" className="-my-1" />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">{filtered.length} of {meditations.length}</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles, verses, lessons…"
            className="w-full rounded-2xl bg-muted/60 pl-10 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f.value ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!loaded ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/60 animate-pulse" />)}
          </div>
        ) : meditations.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-500/15 grid place-items-center">
              <PenLine className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="font-bold">Your journal is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Write your first meditation: a verse, what it teaches, and a prayer.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No meditations match.</p>
        ) : (
          byMonth.map(group => (
            <div key={group.label} className="space-y-2">
              <p className="px-1 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
              {group.items.map(m => {
                const d = new Date(m.created_at)
                const mine = m.author_id === userId
                const preview = plain(m.lesson) || plain(m.application) || plain(m.prayer)
                return (
                  <article key={m.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 active:bg-muted/40 transition">
                    <Link href={`/protected/meditations/${m.id}`} className="flex gap-3 flex-1 min-w-0">
                      <div className={`shrink-0 w-12 rounded-xl py-1.5 flex flex-col items-center justify-center ${
                        m.period === 'morning' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'
                      }`}>
                        <span className="text-[9px] font-black uppercase text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        <span className="text-lg font-black leading-none my-0.5">{d.getDate()}</span>
                        {m.period === 'morning'
                          ? <Sun className="h-3 w-3 text-amber-500" />
                          : <Moon className="h-3 w-3 text-indigo-500" />}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <h4 className="font-bold leading-snug line-clamp-1">{m.title || 'Untitled'}</h4>
                        {m.scripture && (
                          <p className="mt-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400 line-clamp-1">{plain(m.scripture)}</p>
                        )}
                        {preview && <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{preview}</p>}
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                          <span>{d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                          {mine ? (
                            <span className="flex items-center gap-1">
                              {m.visibility === 'shared' ? <><Users className="h-3 w-3" /> Shared</> : <><Lock className="h-3 w-3" /> Private</>}
                            </span>
                          ) : (
                            <span className="rounded-full bg-violet-100 dark:bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                              {partnerName ?? 'Partner'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col justify-between items-end shrink-0">
                      <button
                        onClick={() => copyMeditation(m)}
                        aria-label="Copy meditation"
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted active:scale-90 transition"
                      >
                        {copiedId === m.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      {mine ? (
                        <button
                          onClick={() => setEditing(m)}
                          aria-label="Edit meditation"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted active:scale-90 transition"
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 m-1.5" />
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ))
        )}
      </section>

      {editing && (
        <MeditationComposer
          meditation={editing.id ? editing : undefined}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); loadMeditations(); setVerseVersion(v => v + 1) }}
        />
      )}
    </div>
  )
}
