'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PrayerTimer from './PrayerTimer'
import PrayerCalendar from './PrayerCalendar'
import { ThoughtEditor } from '@/components/note/ThoughtEditor'
import { X, Check, ChevronDown, ChevronUp, Plus, BookOpen } from 'lucide-react'

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

interface DiaryPage {
  id: string
  title: string
  content: string | null
  created_at: string
  section_id: string
}

interface DiarySection {
  id: string
  title: string
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

// ─── Sub-components ──────────────────────────────────────────────────────────

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
          placeholder="How was it answered? (optional)"
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
          {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
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

function DiaryModal({ onClose, onSave, saving, sections, onCreateSection }: {
  onClose: () => void
  onSave: (title: string, content: string, sectionId: string) => Promise<void>
  saving: boolean
  sections: DiarySection[]
  onCreateSection: (title: string) => Promise<DiarySection | null>
}) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const [title, setTitle] = useState(today)
  const [content, setContent] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id ?? '')
  const [showNewCategory, setShowNewCategory] = useState(sections.length === 0)
  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  async function handleCreateCategory() {
    if (!newCategoryTitle.trim()) return
    setCreatingCategory(true)
    const section = await onCreateSection(newCategoryTitle.trim())
    if (section) {
      setSelectedSectionId(section.id)
      setShowNewCategory(false)
      setNewCategoryTitle('')
    }
    setCreatingCategory(false)
  }

  async function submit() {
    if (!title.trim() || !selectedSectionId) return
    await onSave(title.trim(), content.trim(), selectedSectionId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl p-6 space-y-4 mb-20 sm:mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-base">Prayer Diary</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Category</p>
          {sections.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSectionId(s.id); setShowNewCategory(false) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    selectedSectionId === s.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/40'
                  }`}
                >
                  {s.title}
                </button>
              ))}
              <button
                onClick={() => setShowNewCategory(v => !v)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          )}
          {showNewCategory && (
            <div className="flex gap-2">
              <input
                autoFocus={sections.length === 0}
                value={newCategoryTitle}
                onChange={e => setNewCategoryTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                placeholder="Category name..."
                className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryTitle.trim()}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {creatingCategory ? '...' : 'Create'}
              </button>
            </div>
          )}
          {sections.length === 0 && !showNewCategory && (
            <p className="text-xs text-muted-foreground">Create a category above to organise your entries.</p>
          )}
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Entry title..."
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <textarea
          placeholder="What's on your heart today?"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <p className="text-[10px] text-muted-foreground">Saved to your Prayer Diary notebook in Notes.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !title.trim() || !selectedSectionId}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrayerTab(): JSX.Element {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [markAnsweringReq, setMarkAnsweringReq] = useState<PrayerRequest | null>(null)
  const [showAnswered, setShowAnswered] = useState(false)
  const [diaryNotebookId, setDiaryNotebookId] = useState<string | null>(null)
  const [diarySections, setDiarySections] = useState<DiarySection[]>([])
  const [diaryPages, setDiaryPages] = useState<DiaryPage[]>([])
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDiaryPage, setSelectedDiaryPage] = useState<DiaryPage | null>(null)
  const [savingDiary, setSavingDiary] = useState(false)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data: requestsData } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRequests(requestsData ?? [])
    setLoading(false)
    void loadDiary(user.id)
  }

  async function addRequest(req: Omit<PrayerRequest, 'id' | 'created_at' | 'answered_at' | 'answer_note'>) {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase.from('prayer_requests').insert({ ...req, user_id: userId }).select().single()
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

  async function loadDiary(uid: string) {
    const supabase = createClient()
    const { data: nb } = await supabase
      .from('notebooks')
      .select('id, sections(id, title, pages(id, title, content, created_at))')
      .eq('user_id', uid)
      .eq('title', 'Prayer Diary')
      .maybeSingle()
    if (!nb) return
    setDiaryNotebookId(nb.id)
    const rawSections = (nb as any).sections ?? []
    setDiarySections(rawSections.map((s: any) => ({ id: s.id, title: s.title })))
    const allPages: DiaryPage[] = rawSections
      .flatMap((s: any) => (s.pages ?? []).map((p: any) => ({ ...p, section_id: s.id })))
      .sort((a: DiaryPage, b: DiaryPage) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
    setDiaryPages(allPages)
  }

  async function ensureDiaryNotebook(): Promise<string | null> {
    if (diaryNotebookId) return diaryNotebookId
    if (!userId) return null
    const supabase = createClient()
    const { data: existing } = await supabase.from('notebooks').select('id').eq('user_id', userId).eq('title', 'Prayer Diary').maybeSingle()
    if (existing) { setDiaryNotebookId(existing.id); return existing.id }
    const { data: created } = await supabase.from('notebooks').insert({ user_id: userId, title: 'Prayer Diary' }).select('id').single()
    if (!created) return null
    setDiaryNotebookId(created.id)
    return created.id
  }

  async function createDiarySection(sectionTitle: string): Promise<DiarySection | null> {
    const nbId = await ensureDiaryNotebook()
    if (!nbId) return null
    const supabase = createClient()
    const { data } = await supabase.from('sections').insert({ notebook_id: nbId, title: sectionTitle }).select('id, title').single()
    if (!data) return null
    const newSection: DiarySection = { id: data.id, title: data.title }
    setDiarySections(prev => [...prev, newSection])
    return newSection
  }

  async function saveDiaryEntry(title: string, content: string, sectionId: string) {
    setSavingDiary(true)
    const supabase = createClient()
    const htmlContent = content ? `<p>${content.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>` : ''
    const { data } = await supabase.from('pages').insert({ section_id: sectionId, title, content: htmlContent }).select('id, title, content, created_at, section_id').single()
    if (data) setDiaryPages(prev => [data, ...prev].slice(0, 6))
    setSavingDiary(false)
  }

  const active = requests.filter(r => r.status === 'active' || r.status === 'ongoing')
  const answered = requests.filter(r => r.status === 'answered')

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Prayer Timer ────────────────────────────────────── */}
      {userId && (
        <PrayerTimer
          userId={userId}
          onSessionComplete={() => setCalendarRefreshKey(k => k + 1)}
        />
      )}

      {/* ── Prayer Calendar ─────────────────────────────────── */}
      {userId && (
        <PrayerCalendar userId={userId} refreshKey={calendarRefreshKey} />
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
                      {req.answer_note && <p className="text-xs text-muted-foreground mt-1 italic">{req.answer_note}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">Answered {req.answered_at ? daysAgo(req.answered_at) : ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Prayer Diary ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-semibold">Prayer Diary</p>
          </div>
          <button
            onClick={() => setShowDiaryModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add entry
          </button>
        </div>
        {diaryPages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">No diary entries yet.</p>
            <button onClick={() => setShowDiaryModal(true)} className="mt-2 text-sm text-violet-600 hover:underline font-medium">Write your first one</button>
          </div>
        ) : (
          <div className="space-y-2">
            {diaryPages.map(page => (
              <button
                key={page.id}
                onClick={() => setSelectedDiaryPage(page)}
                className="w-full text-left rounded-2xl bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm p-4 hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{page.title}</p>
                    {(() => { const s = diarySections.find(sec => sec.id === page.section_id); return s ? <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 mt-0.5">{s.title}</span> : null })()}
                    {page.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{page.content.replace(/<[^>]+>/g, ' ').trim()}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{daysAgo(page.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
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
      {showDiaryModal && (
        <DiaryModal
          onClose={() => setShowDiaryModal(false)}
          onSave={saveDiaryEntry}
          saving={savingDiary}
          sections={diarySections}
          onCreateSection={createDiarySection}
        />
      )}
      {selectedDiaryPage && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <ThoughtEditor
            page={selectedDiaryPage}
            onBack={async () => {
              setSelectedDiaryPage(null)
              if (userId) await loadDiary(userId)
            }}
            onRefresh={async () => {
              if (userId) await loadDiary(userId)
            }}
          />
        </div>
      )}
    </div>
  )
}


