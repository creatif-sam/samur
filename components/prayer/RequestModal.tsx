'use client'

import { useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { BookOpen, Loader2, X } from 'lucide-react'
import { lookupVerse } from '@/lib/prayer/verse'
import type { Category, PrayerRequest } from '@/lib/prayer/requests'

export const CATEGORY_LABELS: Record<Category, string> = {
  personal: 'Personal',
  family: 'Family',
  intercession: 'Intercession',
  guidance: 'Guidance',
  healing: 'Healing',
  thanksgiving: 'Thanksgiving',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  personal:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  family:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  intercession: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  guidance:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  healing:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  thanksgiving: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

export type RequestDraft = Pick<PrayerRequest, 'title' | 'description' | 'category' | 'is_shared' | 'verse_ref' | 'verse_text'>

// Adding a prayer request, or editing one (title, details, category, sharing and a promise verse)
export default function RequestModal({ initial, onClose, onSave }: {
  initial?: PrayerRequest | null
  onClose: () => void
  onSave: (draft: RequestDraft) => Promise<boolean>   // false keeps the form open
}) {
  const { tr, language } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'personal')
  const [isShared, setIsShared] = useState(initial?.is_shared ?? false)
  const [verseQuery, setVerseQuery] = useState(initial?.verse_ref ?? '')
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(
    initial?.verse_ref ? { ref: initial.verse_ref, text: initial.verse_text ?? '' } : null,
  )
  const [verseNote, setVerseNote] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)
  const [saving, setSaving] = useState(false)

  async function findVerse() {
    const q = verseQuery.trim()
    if (!q) { setVerse(null); return }
    setLooking(true)
    setVerseNote(null)
    const res = await lookupVerse(q, language === 'fr' ? 'fr' : 'en')
    setLooking(false)
    if (res.ok) { setVerse({ ref: res.ref, text: res.text }); setVerseQuery(res.ref); return }
    setVerse(null)
    setVerseNote(
      res.reason === 'needs-verse' ? tr('Add the verse number, e.g. Philippians 4:6')
        : res.reason === 'offline' ? tr('Couldn\'t load the verse. Check your connection.')
          : tr('Couldn\'t find that verse. Try a reference like John 14:27.'),
    )
  }

  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    // A reference typed but not looked up yet is looked up now
    let promise = verse
    if (verseQuery.trim() && verseQuery.trim() !== verse?.ref) {
      const res = await lookupVerse(verseQuery.trim(), language === 'fr' ? 'fr' : 'en')
      promise = res.ok ? { ref: res.ref, text: res.text } : { ref: verseQuery.trim().slice(0, 80), text: '' }
    }
    if (!verseQuery.trim()) promise = null
    const ok = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      category,
      is_shared: isShared,
      verse_ref: promise?.ref ?? null,
      verse_text: promise?.text || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="mb-20 max-h-[85vh] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl sm:mb-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{initial ? tr('Edit prayer request') : tr('New Prayer Request')}</h3>
          <button onClick={onClose} aria-label={tr('Close')} className="p-1 rounded-full hover:bg-muted transition"><X className="w-4 h-4" /></button>
        </div>
        <input
          autoFocus
          placeholder={tr('What are you bringing before God?')}
          value={title}
          maxLength={200}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <textarea
          placeholder={tr('More details (optional)')}
          value={description}
          maxLength={2000}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border bg-muted/30 px-4 py-2.5 text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">{tr('Category')}</p>
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
                {tr(CATEGORY_LABELS[cat])}
              </button>
            ))}
          </div>
        </div>

        {/* A promise to stand on */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /> {tr('A promise (optional)')}</p>
          <div className="flex gap-2">
            <input
              value={verseQuery}
              maxLength={80}
              onChange={e => { setVerseQuery(e.target.value); setVerseNote(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void findVerse() } }}
              placeholder={tr('e.g. Philippians 4:6')}
              className="min-w-0 flex-1 rounded-xl border bg-muted/30 px-4 py-2 text-[16px] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={findVerse}
              disabled={looking || !verseQuery.trim()}
              className="shrink-0 rounded-xl bg-muted px-3 text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
            >
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : tr('Look up')}
            </button>
          </div>
          {verse?.text && verseQuery.trim() === verse.ref && (
            <blockquote className="rounded-xl border-l-4 border-violet-400 bg-violet-50 px-3 py-2 text-xs italic leading-relaxed text-foreground/80 dark:bg-violet-500/10">
              “{verse.text}” <span className="not-italic font-bold text-violet-700 dark:text-violet-300">{verse.ref}</span>
            </blockquote>
          )}
          {verseNote && <p className="text-xs text-amber-700 dark:text-amber-400">{verseNote}</p>}
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={isShared}
            onClick={() => setIsShared(v => !v)}
            className={`relative h-[22px] w-10 rounded-full transition-colors ${isShared ? 'bg-violet-600' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isShared ? 'translate-x-[18px]' : ''}`} />
          </button>
          <span className="text-sm">{tr('Share with partner')}</span>
        </label>
        {isShared && <p className="-mt-3 text-[11px] text-muted-foreground">{tr('Your partner sees it and can pray for it. They are told when you mark it answered.')}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition">{tr('Cancel')}</button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? tr('Saving...') : initial ? tr('Save changes') : tr('Add Request')}
          </button>
        </div>
      </div>
    </div>
  )
}
