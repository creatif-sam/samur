'use client'

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { JSX, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PrayerTimer from './PrayerTimer'
import PrayerCalendar from './PrayerCalendar'
import PartnerPrayerBoard from './PartnerPrayerBoard'
import { ThoughtEditor } from '@/components/note/ThoughtEditor'
import { X, Check, ChevronDown, ChevronUp, Plus, BookOpen, ChevronRight, Play, Pencil, Share2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ensureSystemNotebook, findSystemNotebook } from '@/lib/notes/data'
import { loadDraft, saveDraft } from '@/lib/offline'
import { useVisualViewport } from '@/lib/useVisualViewport'
import { buildDiaryHtml, extractPoints, togglePoint } from '@/lib/prayer/points'
import { classicTimerRunning, clearGuided, loadGuided, saveGuided, type GuidedItem, type GuidedState } from '@/lib/prayer/session'
import GuidedPrayerSetup from './GuidedPrayerSetup'
import GuidedPrayerSession from './GuidedPrayerSession'
import DiaryEntryCard from './DiaryEntryCard'
import RequestModal, { CATEGORY_COLORS, CATEGORY_LABELS, type RequestDraft } from './RequestModal'
import PrayerReminders from './PrayerReminders'
import { composePost } from '@/lib/posts'
import {
  answeredAfter, isMissingPrayerUpdate, loadHistory, loadPartner, loadPartnerRequests, sinceLabel,
  type PrayerHistory, type PrayerRequest,
} from '@/lib/prayer/requests'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MarkAnsweredModal({ request, onClose, onSave }: { request: PrayerRequest; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const { tr } = useTranslation()
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
          <h3 className="font-semibold text-base">{tr('Prayer Answered!')}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">&ldquo;{request.title}&rdquo;</p>
        <textarea
          autoFocus
          placeholder={tr('How was it answered? (optional)')}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">{tr('Cancel')}</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
          >
            {saving ? tr('Saving...') : tr('Mark Answered')}
          </button>
        </div>
      </div>
    </div>
  )
}

// One prayer request. Yours can be prayed for, edited, marked answered or removed;
// your partner's shared ones can be prayed for.
function RequestCard({ req, lastPrayed, partnerPrayed, partnerName, onPray, onEdit, onMarkAnswered, onDelete }: {
  req: PrayerRequest
  lastPrayed?: string
  partnerPrayed?: { count: number; last: string }
  partnerName?: string | null
  onPray: (r: PrayerRequest) => void
  onEdit?: (r: PrayerRequest) => void
  onMarkAnswered?: (r: PrayerRequest) => void
  onDelete?: (r: PrayerRequest) => void
}) {
  const { tr } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const mine = !!onEdit

  return (
    <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="mt-0.5 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{req.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[req.category] ?? CATEGORY_COLORS.personal}`}>
              {tr(CATEGORY_LABELS[req.category] ?? req.category)}
            </span>
            <span className="text-[10px] text-muted-foreground">{sinceLabel(req.created_at)}</span>
            {mine && req.is_shared && <span className="text-[10px] text-violet-500 font-medium">{tr('shared')}</span>}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {lastPrayed ? tr('You last prayed {when}', { when: sinceLabel(lastPrayed) }) : tr('Not prayed for yet')}
            {partnerPrayed && partnerPrayed.count > 0 && (
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {' · '}{tr('{name} prayed {n} {n:time|times}', { name: partnerName || tr('Your partner'), n: partnerPrayed.count })}
              </span>
            )}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {req.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{req.description}</p>}
          {req.verse_ref && (
            <blockquote className="rounded-xl border-l-4 border-violet-400 bg-violet-50 px-3 py-2 text-xs leading-relaxed dark:bg-violet-500/10">
              {req.verse_text && <span className="italic text-foreground/80">“{req.verse_text}” </span>}
              <span className="font-bold text-violet-700 dark:text-violet-300">{req.verse_ref}</span>
            </blockquote>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onPray(req)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />{' '}{tr('Pray for this')}
            </button>
            {onMarkAnswered && (
              <button
                onClick={() => onMarkAnswered(req)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
              >
                <Check className="w-3.5 h-3.5" />{' '}{tr('Answered')}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(req)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/70 text-xs font-medium transition"
              >
                <Pencil className="w-3.5 h-3.5" />{' '}{tr('Edit')}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(req)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium transition"
              >
                <X className="w-3.5 h-3.5" />{' '}{tr('Remove')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DiaryModal({ onClose, onSave, saving, sections, onCreateSection, initialTitle, initialPoints }: {
  onClose: () => void
  onSave: (title: string, html: string, sectionId: string) => Promise<void>
  saving: boolean
  sections: DiarySection[]
  onCreateSection: (title: string) => Promise<DiarySection | null>
  // Set when a prayer session adds itself to the diary
  initialTitle?: string
  initialPoints?: { text: string; checked: boolean }[]
}) {
  const { tr } = useTranslation()
  const today = new Date().toLocaleDateString(appLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const [title, setTitle] = useState(initialTitle ?? today)
  const [content, setContent] = useState('')
  // Prayer points become a checklist you can tick here and in Notes
  const [points, setPoints] = useState<{ text: string; checked: boolean }[]>(initialPoints ?? [])
  const [pointDraft, setPointDraft] = useState('')
  const visible = useVisualViewport()
  const fit = visible?.keyboardOpen ? visible : null

  function addPoint() {
    const text = pointDraft.trim()
    if (!text) return
    setPoints(prev => [...prev, { text, checked: false }])
    setPointDraft('')
  }
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
    const allPoints = pointDraft.trim() ? [...points, { text: pointDraft.trim(), checked: false }] : points
    await onSave(title.trim(), buildDiaryHtml(content, allPoints), selectedSectionId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      style={fit ? { top: fit.offsetTop, height: fit.height, bottom: 'auto' } : undefined}
    >
      <div
        className="w-full max-w-md bg-background rounded-3xl shadow-2xl p-6 space-y-4 mb-20 sm:mb-0 overflow-y-auto"
        style={{ maxHeight: fit ? fit.height - 16 : 'calc(100dvh - 7rem)', marginBottom: fit ? 8 : undefined }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-base">{tr('Prayer Diary')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{tr('Category')}</p>
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
                <Plus className="w-3 h-3" />{' '}{tr('New')}
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
                placeholder={tr('Category name...')}
                className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryTitle.trim()}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {creatingCategory ? '...' : tr('Create')}
              </button>
            </div>
          )}
          {sections.length === 0 && !showNewCategory && (
            <p className="text-xs text-muted-foreground">{tr('Create a category above to organise your entries.')}</p>
          )}
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={tr('Entry title...')}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <textarea
          placeholder={tr('What\'s on your heart today?')}
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{tr('Prayer points')}{' '}<span className="normal-case tracking-normal font-medium">{tr('(optional)')}</span></p>
          {points.length > 0 && (
            <ul className="space-y-1.5">
              {points.map((pt, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${pt.checked ? 'border-violet-600 bg-violet-600 text-white' : 'border-muted-foreground/40'}`}>
                    {pt.checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{pt.text}</span>
                  <button type="button" onClick={() => setPoints(prev => prev.filter((_, j) => j !== i))} aria-label={tr('Remove {text}', { text: pt.text })} className="p-1 rounded-full text-muted-foreground hover:bg-muted">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={pointDraft}
              onChange={e => setPointDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPoint() } }}
              placeholder={tr('Add a point, e.g. Healing for Mum')}
              className="min-w-0 flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button type="button" onClick={addPoint} disabled={!pointDraft.trim()} className="px-3 py-2 rounded-xl bg-muted text-xs font-semibold disabled:opacity-50">
              {tr('Add')}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{tr('Saved to your Prayer Diary notebook in Notes. Tick points off on this tab or in Notes.')}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">{tr('Cancel')}</button>
          <button
            onClick={submit}
            disabled={saving || !title.trim() || !selectedSectionId}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? tr('Saving...') : tr('Save Entry')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrayerTab(): JSX.Element {
  const { tr } = useTranslation()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editing, setEditing] = useState<PrayerRequest | null>(null)
  const [markAnsweringReq, setMarkAnsweringReq] = useState<PrayerRequest | null>(null)
  // Your partner, their shared requests, and who prayed for what (every device)
  const [partner, setPartner] = useState<{ id: string; name: string | null } | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [partnerRequests, setPartnerRequests] = useState<PrayerRequest[]>([])
  const [history, setHistory] = useState<PrayerHistory>({ lastPrayed: {}, partnerPrayers: {} })
  const [testified, setTestified] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    try { setTestified(new Set(JSON.parse(localStorage.getItem('prayer-testimonies') ?? '[]'))) } catch { /* storage unavailable */ }
  }, [])
  // Removals wait a few seconds so they can be undone
  const pendingDeletes = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>())
  const [showAnswered, setShowAnswered] = useState(false)
  const [diaryNotebookId, setDiaryNotebookId] = useState<string | null>(null)
  const [diarySections, setDiarySections] = useState<DiarySection[]>([])
  const [diaryPages, setDiaryPages] = useState<DiaryPage[]>([])
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDiaryPage, setSelectedDiaryPage] = useState<DiaryPage | null>(null)
  const [savingDiary, setSavingDiary] = useState(false)
  // Guided prayer sessions (new): the setup sheet, the running session, and a diary entry it can prefill
  const [guidedSetup, setGuidedSetup] = useState<{ topicId: string | null } | null>(null)
  const [guided, setGuided] = useState<GuidedState | null>(null)
  const [diaryPrefill, setDiaryPrefill] = useState<{ title: string; points: { text: string; checked: boolean }[] } | null>(null)
  const diaryPagesRef = useRef<DiaryPage[]>([])
  const pointQueue = useRef(new Map<string, Promise<void>>())

  useEffect(() => { void loadAll() }, [])
  useEffect(() => { diaryPagesRef.current = diaryPages }, [diaryPages])
  // A session still running in this tab (e.g. after moving between pages) comes back
  useEffect(() => { const g = loadGuided(); if (g) setGuided(g) }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data: requestsData, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toast.error(tr('Couldn\'t load your prayer requests. Check your connection.'))
    const own = (requestsData ?? []) as PrayerRequest[]
    setRequests(own)
    setLoading(false)
    void loadDiary(user.id)
    void loadPeople(user.id, own)
  }

  // Partner, their shared requests and the prayer history (all optional: they load after the list)
  async function loadPeople(uid: string, own: PrayerRequest[]) {
    const supabase = createClient()
    try {
      const [p, me] = await Promise.all([
        loadPartner(supabase, uid),
        supabase.from('profiles').select('name').eq('id', uid).maybeSingle(),
      ])
      setPartner(p)
      setMyName((me.data?.name as string | null) ?? null)
      const [theirs, hist] = await Promise.all([
        p ? loadPartnerRequests(supabase, p.id) : Promise.resolve([] as PrayerRequest[]),
        loadHistory(supabase, uid, own.map(r => r.id)),
      ])
      setPartnerRequests(theirs)
      setHistory(hist)
    } catch (err) {
      console.error('Failed to load partner prayer requests', err)
    }
  }

  function refreshHistory() {
    if (!userId) return
    loadHistory(createClient(), userId, requests.map(r => r.id)).then(setHistory).catch(() => {})
  }

  // Saves a request; before the prayer update the promise verse can't be stored yet
  async function writeRequest(draft: RequestDraft, id?: string) {
    const supabase = createClient()
    const run = (row: Record<string, unknown>) => id
      ? supabase.from('prayer_requests').update(row).eq('id', id).select().single()
      : supabase.from('prayer_requests').insert({ ...row, status: 'active', user_id: userId }).select().single()
    let { data, error } = await run({ ...draft })
    if (error && /verse/.test(error.message) && isMissingPrayerUpdate(error.message)) {
      const { verse_ref: _r, verse_text: _t, ...rest } = draft // eslint-disable-line @typescript-eslint/no-unused-vars
      ;({ data, error } = await run(rest))
      if (!error && draft.verse_ref) toast(tr('Saved. The promise verse needs a quick database update first: run the prayer migration in Supabase.'))
    }
    return { data: data as PrayerRequest | null, error }
  }

  async function addRequest(draft: RequestDraft) {
    if (!userId) return false
    const { data, error } = await writeRequest(draft)
    if (error || !data) { toast.error(tr('Couldn\'t save the request. Check your connection.')); return false }
    setRequests(prev => [data, ...prev])
    return true
  }

  async function saveEdit(req: PrayerRequest, draft: RequestDraft) {
    const { data, error } = await writeRequest(draft, req.id)
    if (error || !data) { toast.error(tr('Couldn\'t save the request. Check your connection.')); return false }
    setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, ...data } : r)))
    return true
  }

  async function markAnswered(req: PrayerRequest, note: string) {
    const now = new Date().toISOString()
    const patch = { status: 'answered' as const, answer_note: note || null, answered_at: now }
    setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, ...patch } : r)))
    const { data, error } = await createClient().from('prayer_requests').update(patch).eq('id', req.id).select('id')
    if (error || !data?.length) {
      setRequests(prev => prev.map(r => (r.id === req.id ? req : r)))
      toast.error(tr('Couldn\'t mark it answered. Check your connection.'))
      return
    }
    toast.success(tr('Praise God! 🎉'))
    // A shared request: your partner prayed for it too, so they hear the answer
    if (req.is_shared && partner) {
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: partner.id,
          type: 'request_prayed',
          title: tr('🎉 {name}\'s prayer was answered', { name: myName || tr('Your partner') }),
          body: (note ? `${req.title}: ${note}` : req.title).slice(0, 180),
          url: '/protected/posts?tab=prayer',
        }),
      }).catch(() => {})
    }
  }

  // Removed at once on screen, deleted after a few seconds unless undone
  function deleteRequest(req: PrayerRequest) {
    setRequests(prev => prev.filter(r => r.id !== req.id))
    const run = async () => {
      pendingDeletes.current.delete(req.id)
      const { data, error } = await createClient().from('prayer_requests').delete().eq('id', req.id).select('id')
      if (error || !data?.length) {
        setRequests(prev => (prev.some(r => r.id === req.id) ? prev : [req, ...prev]))
        toast.error(tr('Couldn\'t remove the request. Check your connection.'))
      }
    }
    pendingDeletes.current.set(req.id, { timer: setTimeout(run, 5000), run })
    toast(tr('Request removed'), {
      duration: 5000,
      action: {
        label: tr('Undo'),
        onClick: () => {
          const pending = pendingDeletes.current.get(req.id)
          if (pending) clearTimeout(pending.timer)
          pendingDeletes.current.delete(req.id)
          setRequests(prev => [req, ...prev.filter(r => r.id !== req.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)))
        },
      },
    })
  }
  // Leaving the tab doesn't cancel a removal: it is done straight away
  useEffect(() => () => {
    for (const { timer, run } of pendingDeletes.current.values()) { clearTimeout(timer); void run() }
  }, [])

  // An answered prayer shared as a post, to encourage your partner
  async function shareTestimony(req: PrayerRequest) {
    const after = req.answered_at ? answeredAfter(req.created_at, req.answered_at) : ''
    const body = [`🙏 ${req.title}`, req.answer_note, after].filter(Boolean).join('\n')
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composePost('gratitude', body), visibility: 'shared' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setTestified(prev => {
        const next = new Set(prev).add(req.id)
        try { localStorage.setItem('prayer-testimonies', JSON.stringify([...next].slice(-200))) } catch { /* storage unavailable */ }
        return next
      })
      toast.success(tr('Shared in Posts'))
    } catch {
      toast.error(tr('Couldn\'t share it. Check your connection.'))
    }
  }

  async function loadDiary(uid: string) {
    const supabase = createClient()
    const diaryId = await findSystemNotebook(supabase, uid, 'prayer_diary')
    if (!diaryId) return
    const { data: nb } = await supabase
      .from('notebooks')
      .select('id, sections(id, title, pages(id, title, content, created_at))')
      .eq('id', diaryId)
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
    try {
      const id = await ensureSystemNotebook(supabase, userId, 'prayer_diary')
      setDiaryNotebookId(id)
      return id
    } catch {
      return null
    }
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

  async function saveDiaryEntry(title: string, htmlContent: string, sectionId: string) {
    setSavingDiary(true)
    const supabase = createClient()
    const { data } = await supabase.from('pages').insert({ section_id: sectionId, title, content: htmlContent }).select('id, title, content, created_at, section_id').single()
    if (data) setDiaryPages(prev => [data, ...prev].slice(0, 6))
    setSavingDiary(false)
  }

  // Ticks a point straight from the Prayer tab. One write at a time per entry, from the latest
  // content; a failed or blocked write is undone. An unsaved device draft of the same note gets
  // the same tick, so opening the note later does not bring the old state back.
  function togglePagePoint(pageId: string, index: number) {
    const run = async () => {
      const page = diaryPagesRef.current.find(p => p.id === pageId)
      if (!page?.content) return
      const before = page.content
      const point = extractPoints(before)[index]
      const after = togglePoint(before, index)
      if (!point || after === before) return
      diaryPagesRef.current = diaryPagesRef.current.map(p => (p.id === pageId ? { ...p, content: after } : p))
      setDiaryPages(diaryPagesRef.current)
      const { data, error } = await createClient()
        .from('pages')
        .update({ content: after, updated_at: new Date().toISOString() })
        .eq('id', pageId)
        .select('id')
      if (error || !data?.length) {
        diaryPagesRef.current = diaryPagesRef.current.map(p => (p.id === pageId && p.content === after ? { ...p, content: before } : p))
        setDiaryPages(diaryPagesRef.current)
        toast.error(tr('Couldn\'t save that tick. Check your connection.'))
        return
      }
      const key = `note:${pageId}`
      const draft = loadDraft<{ title: string; content: string }>(key)
      if (draft?.content) {
        const same = extractPoints(draft.content)[index]
        if (same && same.text === point.text) saveDraft(key, { title: draft.title, content: togglePoint(draft.content, index, !point.checked) })
      }
    }
    const previous = pointQueue.current.get(pageId) ?? Promise.resolve()
    const next = previous.then(run, run)
    pointQueue.current.set(pageId, next)
  }

  // ── Guided prayer session ──
  function openGuidedSetup(topicId: string | null) {
    if (guided) return
    setGuidedSetup({ topicId })
  }
  function beginGuided(state: GuidedState) {
    saveGuided(state)
    setGuided(state)
    setGuidedSetup(null)
  }
  function updateGuided(state: GuidedState) {
    saveGuided(state)
    setGuided(state)
  }
  function closeGuided() {
    clearGuided()
    setGuided(null)
  }
  function guidedToDiary(prayed: GuidedItem[]) {
    closeGuided()
    const day = new Date().toLocaleDateString(appLocale(), { weekday: 'long', month: 'long', day: 'numeric' })
    setDiaryPrefill({ title: `Prayer session · ${day}`, points: prayed.map(i => ({ text: i.title, checked: true })) })
    setShowDiaryModal(true)
  }

  const active = requests.filter(r => r.status === 'active' || r.status === 'ongoing')
  const toGuided = (r: PrayerRequest, theirs = false) => ({
    id: r.id, title: r.title, description: r.description, category: r.category,
    verse_ref: r.verse_ref ?? null, verse_text: r.verse_text ?? null,
    ...(theirs ? { partner: true, owner_name: partner?.name ?? null } : {}),
  })
  const prayable = [...active.map(r => toGuided(r)), ...partnerRequests.map(r => toGuided(r, true))]
  const answered = requests.filter(r => r.status === 'answered')

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Bible Button ─────────────────────────────────── */}
      <button
        onClick={() => router.push('/protected/bible')}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className="bg-white/20 rounded-2xl p-2.5">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-black uppercase tracking-wide text-sm">{tr('Holy Bible')}</p>
          <p className="text-xs text-white/75 mt-0.5">{tr('Read KJV · Save verses · Search passages')}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
      </button>

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

      {/* ── Partner Streaks ─────────────────────────────────── */}
      <PartnerPrayerBoard refreshKey={calendarRefreshKey} />

      {/* ── Daily prayer times ──────────────────────────────── */}
      {userId && <PrayerReminders userId={userId} />}

      {/* ── Active Requests ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-0.5">
            <p className="text-sm font-semibold text-foreground">{tr('Prayer Requests')}</p>
            <HelpTip topic="prayer.requests" align="left" className="-my-1" />
          </div>
          <div className="flex items-center gap-3">
            {prayable.length > 0 && (
              <button
                onClick={() => openGuidedSetup(null)}
                className="flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />{' '}{tr('Pray through')}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />{' '}{tr('Add')}
            </button>
          </div>
        </div>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">{tr('No active prayer requests.')}</p>
            <button onClick={() => setShowAddModal(true)} className="mt-2 text-sm text-violet-600 hover:underline font-medium">{tr('Add your first one')}</button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                lastPrayed={history.lastPrayed[req.id]}
                partnerPrayed={history.partnerPrayers[req.id]}
                partnerName={partner?.name}
                onMarkAnswered={setMarkAnsweringReq}
                onEdit={setEditing}
                onDelete={deleteRequest}
                onPray={r => openGuidedSetup(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Your partner's shared requests ─────────────────── */}
      {partner && partnerRequests.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-semibold text-foreground">{tr('Pray for {name}', { name: partner.name || tr('your partner') })}</p>
            <HelpTip topic="prayer.partner" align="left" className="-my-1" />
          </div>
          <div className="space-y-2">
            {partnerRequests.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                lastPrayed={history.lastPrayed[req.id]}
                onPray={r => openGuidedSetup(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Answered Prayers ────────────────────────────────── */}
      {answered.length > 0 && (
        <div>
          <button
            onClick={() => setShowAnswered(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3 w-full"
          >
            <span className="flex-1 text-left">{tr('Testimonies: answered prayers ({answeredCount})', { answeredCount: answered.length })}</span>
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
                      {req.answered_at && (
                        <p className="mt-1.5 text-[11px] font-bold text-green-700 dark:text-green-400">
                          {answeredAfter(req.created_at, req.answered_at)}
                          <span className="font-normal text-muted-foreground"> · {sinceLabel(req.answered_at)}</span>
                        </p>
                      )}
                      <button
                        onClick={() => shareTestimony(req)}
                        disabled={testified.has(req.id)}
                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-green-800 disabled:opacity-60 dark:bg-green-950/50 dark:text-green-300"
                      >
                        <Share2 className="h-3 w-3" /> {testified.has(req.id) ? tr('Shared ✓') : tr('Share as a testimony')}
                      </button>
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
            <p className="text-sm font-semibold">{tr('Prayer Diary')}</p>
            <HelpTip topic="prayer.diary" align="left" className="-my-1" />
          </div>
          <button
            onClick={() => setShowDiaryModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />{' '}{tr('Add entry')}
          </button>
        </div>
        {diaryPages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">{tr('No diary entries yet.')}</p>
            <button onClick={() => setShowDiaryModal(true)} className="mt-2 text-sm text-violet-600 hover:underline font-medium">{tr('Write your first one')}</button>
          </div>
        ) : (
          <div className="space-y-2">
            {diaryPages.map(page => (
              <DiaryEntryCard
                key={page.id}
                page={page}
                sectionTitle={diarySections.find(sec => sec.id === page.section_id)?.title}
                onOpen={() => setSelectedDiaryPage(page)}
                onToggle={i => togglePagePoint(page.id, i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showAddModal && (
        <RequestModal onClose={() => setShowAddModal(false)} onSave={addRequest} />
      )}
      {editing && (
        <RequestModal initial={editing} onClose={() => setEditing(null)} onSave={draft => saveEdit(editing, draft)} />
      )}
      {markAnsweringReq && (
        <MarkAnsweredModal
          request={markAnsweringReq}
          onClose={() => setMarkAnsweringReq(null)}
          onSave={note => markAnswered(markAnsweringReq, note)}
        />
      )}
      {showDiaryModal && (
        <DiaryModal
          onClose={() => { setShowDiaryModal(false); setDiaryPrefill(null) }}
          onSave={saveDiaryEntry}
          saving={savingDiary}
          sections={diarySections}
          onCreateSection={createDiarySection}
          initialTitle={diaryPrefill?.title}
          initialPoints={diaryPrefill?.points}
        />
      )}
      {guidedSetup && (
        <GuidedPrayerSetup
          requests={prayable}
          lastPrayed={history.lastPrayed}
          initialTopicId={guidedSetup.topicId}
          blockedReason={classicTimerRunning() ? tr('Your prayer timer is running. Finish or stop it first.') : null}
          onStart={beginGuided}
          onClose={() => setGuidedSetup(null)}
        />
      )}
      {guided && userId && (
        <GuidedPrayerSession
          state={guided}
          userId={userId}
          myName={myName}
          partnerId={partner?.id ?? null}
          onState={updateGuided}
          onSaved={() => { setCalendarRefreshKey(k => k + 1); setTimeout(refreshHistory, 800) }}
          onAddToDiary={guidedToDiary}
          onClose={closeGuided}
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
            onSaved={(patch) => {
              setDiaryPages(prev => prev.map(p => (p.id === patch.id ? { ...p, ...patch } : p)))
            }}
          />
        </div>
      )}
    </div>
  )
}


