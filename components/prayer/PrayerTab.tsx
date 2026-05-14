'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, ChevronDown, ChevronUp, Flame, X, Sparkles, Ear } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'personal' | 'family' | 'intercession' | 'guidance' | 'healing' | 'thanksgiving'
type Status = 'active' | 'answered' | 'ongoing'

interface PrayerEntry {
  id: string
  date: string
  completed: boolean
  duration_minutes: number | null
  notes: string | null
  listened_to_god?: boolean
}

interface PrayerRequest {
  id: string
  title: string
  description: string | null
  category: Category
  status: Status
  is_shared: boolean
  answer_note: string | null
  answered_at: string | null
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  personal: 'Personal',
  family: 'Family',
  intercession: 'Intercession',
  guidance: 'Guidance',
  healing: 'Healing',
  thanksgiving: 'Thanksgiving',
}

const CATEGORY_COLORS: Record<Category, string> = {
  personal:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  family:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  intercession: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  guidance:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  healing:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  thanksgiving: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

const QUICK_DURATIONS = [5, 10, 15, 20, 30]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function calcStreak(entries: PrayerEntry[]): number {
  const doneSet = new Set(entries.filter(e => e.completed).map(e => e.date))
  let streak = 0
  const d = new Date()
  // allow today to be incomplete (streak extends if yesterday was done)
  if (!doneSet.has(todayISO())) d.setDate(d.getDate() - 1)
  while (doneSet.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ─── Add Request Modal ────────────────────────────────────────────────────────

function AddRequestModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Omit<PrayerRequest, 'id' | 'created_at' | 'answered_at' | 'answer_note'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('personal')
  const [isShared, setIsShared] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), description: description.trim() || null, category, status: 'active', is_shared: isShared })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl p-6 space-y-5 mb-20 sm:mb-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">New Prayer Request</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>

        <input
          autoFocus
          placeholder="What are you bringing before God?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        <textarea
          placeholder="More details (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Category</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  category === cat
                    ? CATEGORY_COLORS[cat] + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsShared(v => !v)}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${isShared ? 'bg-violet-600' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isShared ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm">Share with partner</span>
        </label>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mark Answered Modal ──────────────────────────────────────────────────────

function MarkAnsweredModal({ request, onClose, onSave }: { request: PrayerRequest; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    await onSave(note.trim())
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl p-6 space-y-4 mb-20 sm:mb-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Prayer Answered!</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">&ldquo;{request.title}&rdquo;</p>
        <textarea
          autoFocus
          placeholder="How was it answered? (optional — write your testimony)"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
          >
            {saving ? 'Saving...' : 'Mark Answered'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ req, onMarkAnswered, onDelete }: {
  req: PrayerRequest
  onMarkAnswered: (r: PrayerRequest) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="mt-0.5 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{req.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[req.category]}`}>
              {CATEGORY_LABELS[req.category]}
            </span>
            <span className="text-[10px] text-muted-foreground">{daysAgo(req.created_at)}</span>
            {req.is_shared && <span className="text-[10px] text-violet-500 font-medium">shared</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {req.description && (
            <p className="text-sm text-muted-foreground">{req.description}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onMarkAnswered(req)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" /> Answered
            </button>
            <button
              onClick={() => onDelete(req.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium transition"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrayerTab() {
  const [userId, setUserId] = useState<string | null>(null)
  const [todayEntry, setTodayEntry] = useState<PrayerEntry | null>(null)
  const [entries, setEntries] = useState<PrayerEntry[]>([])
  const [firstPrayedDate, setFirstPrayedDate] = useState<string | null>(null)
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [markAnsweringReq, setMarkAnsweringReq] = useState<PrayerRequest | null>(null)
  const [showAnswered, setShowAnswered] = useState(false)
  const [prayingDuration, setPrayingDuration] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [listenedToGod, setListenedToGod] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const today = todayISO()

    const [{ data: entriesData }, { data: requestsData }, { data: firstData }] = await Promise.all([
      supabase.from('prayer_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(60),
      supabase.from('prayer_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('prayer_entries').select('date').eq('user_id', user.id).eq('completed', true).order('date', { ascending: true }).limit(1).maybeSingle(),
    ])

    const allEntries: PrayerEntry[] = entriesData ?? []
    setEntries(allEntries)
    const todayEnt = allEntries.find(e => e.date === today) ?? null
    setTodayEntry(todayEnt)
    if (todayEnt) setListenedToGod(todayEnt.listened_to_god ?? false)
    setFirstPrayedDate((firstData as { date: string } | null)?.date ?? null)
    setRequests(requestsData ?? [])
    setLoading(false)
  }

  async function markPrayedToday() {
    if (!userId || savingEntry) return
    setSavingEntry(true)
    const supabase = createClient()
    const today = todayISO()

    if (todayEntry?.completed) {
      // toggle off — already prayed, undo it
      await supabase.from('prayer_entries').update({ completed: false, duration_minutes: null, notes: null, listened_to_god: false }).eq('id', todayEntry.id)
      setTodayEntry({ ...todayEntry, completed: false, duration_minutes: null, notes: null, listened_to_god: false })
      setListenedToGod(false)
      setEntries(prev => prev.map(e => e.date === today ? { ...e, completed: false } : e))
    } else {
      // mark as prayed — upsert handles both new row and existing incomplete row
      const { data } = await supabase.from('prayer_entries')
        .upsert({ user_id: userId, date: today, completed: true, duration_minutes: prayingDuration, notes: noteDraft.trim() || null, listened_to_god: listenedToGod }, { onConflict: 'user_id,date' })
        .select().single()
      if (data) {
        setTodayEntry(data)
        setEntries(prev => [data, ...prev.filter(e => e.date !== today)])
        if (!firstPrayedDate) setFirstPrayedDate(today)
      }
    }
    setSavingEntry(false)
  }

  async function saveDurationAndNote() {
    if (!userId || !todayEntry?.completed) return
    setSavingEntry(true)
    const supabase = createClient()
    await supabase.from('prayer_entries').update({ duration_minutes: prayingDuration, notes: noteDraft.trim() || null, listened_to_god: listenedToGod }).eq('id', todayEntry.id)
    setTodayEntry(prev => prev ? { ...prev, duration_minutes: prayingDuration, notes: noteDraft.trim() || null, listened_to_god: listenedToGod } : prev)
    setSavingEntry(false)
  }

  async function addRequest(req: Omit<PrayerRequest, 'id' | 'created_at' | 'answered_at' | 'answer_note'>) {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase.from('prayer_requests')
      .insert({ ...req, user_id: userId })
      .select().single()
    if (data) setRequests(prev => [data, ...prev])
  }

  async function markAnswered(id: string, note: string) {
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('prayer_requests').update({ status: 'answered', answer_note: note || null, answered_at: now }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'answered', answer_note: note || null, answered_at: now } : r))
  }

  async function deleteRequest(id: string) {
    const supabase = createClient()
    await supabase.from('prayer_requests').delete().eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const streak = calcStreak(entries)
  const active = requests.filter(r => r.status === 'active' || r.status === 'ongoing')
  const answered = requests.filter(r => r.status === 'answered')
  const prayedToday = todayEntry?.completed ?? false

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Today's Prayer Card ─────────────────────────────── */}
      <div className={`rounded-3xl p-5 transition-colors ${prayedToday ? 'bg-violet-600 text-white' : 'bg-muted/40 border'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${prayedToday ? 'text-violet-200' : 'text-muted-foreground'}`}>Today</p>
            <p className={`text-lg font-bold mt-0.5 ${prayedToday ? 'text-white' : 'text-foreground'}`}>
              {prayedToday ? 'Prayer done' : 'Have you prayed today?'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className={`w-4 h-4 ${streak > 0 ? (prayedToday ? 'text-amber-300' : 'text-amber-500') : 'text-muted-foreground'}`} />
            <span className={`text-sm font-bold ${prayedToday ? 'text-white' : 'text-foreground'}`}>{streak}d</span>
          </div>
        </div>

        <button
          onClick={markPrayedToday}
          disabled={savingEntry}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
            prayedToday
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/30'
          }`}
        >
          {prayedToday ? <><Check className="w-4 h-4" /> Prayed today</> : 'Mark as Prayed'}
        </button>

        {prayedToday && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-violet-200 mb-2">Duration</p>
              <div className="flex gap-2 flex-wrap">
                {QUICK_DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setPrayingDuration(prev => prev === d ? null : d)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      prayingDuration === d ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="What did you bring before God today? (optional)"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              rows={2}
              className="w-full bg-white/20 placeholder:text-violet-200 text-white text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setListenedToGod(v => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${listenedToGod ? 'bg-white border-white' : 'border-white/50'}`}
              >
                {listenedToGod && <Check className="w-3 h-3 text-violet-700" />}
              </div>
              <span className="flex items-center gap-1.5 text-sm text-white">
                <Ear className="w-3.5 h-3.5" /> I listened to God
              </span>
            </label>
            <button onClick={saveDurationAndNote} disabled={savingEntry} className="text-xs text-white/80 hover:text-white underline transition">
              {savingEntry ? 'Saving...' : 'Save note'}
            </button>
          </div>
        )}
      </div>

      {/* ── First Prayer Day Milestone ───────────────────── */}
      {firstPrayedDate && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">First prayer</p>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {new Date(firstPrayedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">The day your journey began</p>
          </div>
        </div>
      )}

      {/* ── Active Requests ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Prayer Requests</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">No active prayer requests.</p>
            <button onClick={() => setShowAddModal(true)} className="mt-2 text-sm text-violet-600 hover:underline font-medium">Add your first one</button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                onMarkAnswered={setMarkAnsweringReq}
                onDelete={deleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Answered Prayers ────────────────────────────────── */}
      {answered.length > 0 && (
        <div>
          <button
            onClick={() => setShowAnswered(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3 w-full"
          >
            <span className="flex-1 text-left">Answered Prayers ({answered.length})</span>
            {showAnswered ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showAnswered && (
            <div className="space-y-2">
              {answered.map(req => (
                <div key={req.id} className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{req.title}</p>
                      {req.answer_note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{req.answer_note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Answered {req.answered_at ? daysAgo(req.answered_at) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      {showAddModal && (
        <AddRequestModal onClose={() => setShowAddModal(false)} onSave={addRequest} />
      )}
      {markAnsweringReq && (
        <MarkAnsweredModal
          request={markAnsweringReq}
          onClose={() => setMarkAnsweringReq(null)}
          onSave={note => markAnswered(markAnsweringReq.id, note)}
        />
      )}
    </div>
  )
}
