'use client'

import { JSX, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PrayerTimer from './PrayerTimer'
import PrayerCalendar from './PrayerCalendar'

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

// ─── Diary Modal ──────────────────────────────────────────────────────────────

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
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category picker */}
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

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">
      {userId && (
        <PrayerTimer
          userId={userId}
          onSessionComplete={() => setCalendarRefreshKey(k => k + 1)}
        />
      )}
      {userId && (
        <PrayerCalendar userId={userId} refreshKey={calendarRefreshKey} />
      )}
    </div>
  )
}


