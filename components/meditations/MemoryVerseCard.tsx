'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Brain, Check, ChevronDown, Copy, Eye, EyeOff, Loader2, Pencil, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TRANSLATIONS } from '@/components/bible/bibleConstants'
import { parseDateKey, toLocalDateKey } from '@/lib/dates'

type MemoryVerse = {
  id: string
  user_id: string
  day: string
  reference: string
  text: string
  translation: string | null
  visibility: 'private' | 'shared'
  memorized: boolean
}

// full text → first letter of each word → blanks
type PracticeLevel = 'full' | 'hints' | 'hidden'
const NEXT_LEVEL: Record<PracticeLevel, PracticeLevel> = { full: 'hints', hints: 'hidden', hidden: 'full' }
const HISTORY_LIMIT = 30
// bible-api.com has no French texts (LSG/NEF return 404); those verses can be typed in
const LOOKUP_TRANSLATIONS = TRANSLATIONS.filter(t => t.id !== 'lsg' && t.id !== 'nef')

function formatDay(key: string) {
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function PracticeText({ text, level }: { text: string; level: PracticeLevel }) {
  if (level === 'full') return <>{text}</>
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        if (/^\s+$/.test(part)) return part
        const match = part.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u)
        if (!match) return part
        const [, lead, word, trail] = match
        const shown = level === 'hints' ? word[0] + '_'.repeat(word.length - 1) : '_'.repeat(word.length)
        return <span key={i} className="tracking-wider">{lead}{shown}{trail}</span>
      })}
    </>
  )
}

export default function MemoryVerseCard() {
  const supabase = createClient()
  const today = toLocalDateKey(new Date())

  const [userId, setUserId] = useState<string | null>(null)
  const [verse, setVerse] = useState<MemoryVerse | null>(null)
  const [history, setHistory] = useState<MemoryVerse[]>([])
  const [partnerVerse, setPartnerVerse] = useState<MemoryVerse | null>(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [reference, setReference] = useState('')
  const [text, setText] = useState('')
  const [translation, setTranslation] = useState('kjv')
  const [shared, setShared] = useState(true)
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)

  const [level, setLevel] = useState<PracticeLevel>('full')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const uid = auth.user.id
    setUserId(uid)

    const [{ data: profile }, { data: own, error }] = await Promise.all([
      supabase.from('profiles').select('partner_id').eq('id', uid).single(),
      supabase
        .from('memory_verses')
        .select('*')
        .eq('user_id', uid)
        .lte('day', today)
        .order('day', { ascending: false })
        .limit(HISTORY_LIMIT + 1),
    ])
    if (error) console.error('Failed to load memory verses', error)

    const rows = (own ?? []) as MemoryVerse[]
    const todays = rows.find(v => v.day === today) ?? null
    setVerse(todays)
    setHistory(rows.filter(v => v.day !== today).slice(0, HISTORY_LIMIT))
    if (todays) setTranslation(todays.translation || 'kjv')
    else if (rows[0]?.translation) setTranslation(rows[0].translation)

    if (profile?.partner_id) {
      const [{ data: pVerse }, { data: pProfile }] = await Promise.all([
        supabase.from('memory_verses').select('*').eq('user_id', profile.partner_id).eq('day', today).maybeSingle(),
        supabase.from('profiles').select('name').eq('id', profile.partner_id).maybeSingle(),
      ])
      setPartnerVerse((pVerse as MemoryVerse | null) ?? null)
      if (pProfile?.name) setPartnerName(pProfile.name)
    }
    setLoading(false)
  }

  function startEditing(from?: Pick<MemoryVerse, 'reference' | 'text' | 'translation' | 'visibility'>) {
    setReference(from?.reference ?? '')
    setText(from?.text ?? '')
    const t = from?.translation || translation
    setTranslation(LOOKUP_TRANSLATIONS.some(x => x.id === t) ? t : 'kjv')
    setShared((from?.visibility ?? 'shared') === 'shared')
    setEditing(true)
  }

  async function lookUp() {
    const ref = reference.trim()
    if (!ref) return
    setLookingUp(true)
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      if (!data?.text) throw new Error('empty')
      setText(String(data.text).replace(/\s+/g, ' ').trim())
      if (data.reference) setReference(data.reference)
    } catch {
      toast.error("Couldn't find that verse. Check the reference, e.g. John 3:16, or type the text yourself.")
    } finally {
      setLookingUp(false)
    }
  }

  async function save(values?: { reference: string; text: string; translation: string | null; visibility: 'private' | 'shared' }) {
    if (!userId) return
    const payload = values ?? {
      reference: reference.trim(),
      text: text.trim(),
      translation,
      visibility: shared ? 'shared' as const : 'private' as const,
    }
    if (!payload.reference || !payload.text) {
      toast.error('Add a reference and the verse text')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('memory_verses')
      .upsert({
        user_id: userId,
        day: today,
        ...payload,
        // Changing the verse resets progress; re-saving the same one keeps it
        memorized: verse?.reference === payload.reference ? verse.memorized : false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,day' })
      .select()
      .single()
    setSaving(false)

    if (error) {
      console.error('Failed to save memory verse', error)
      toast.error("Couldn't save your verse. Check your connection.")
      return
    }
    setVerse(data as MemoryVerse)
    setEditing(false)
    setLevel('full')
    toast.success("Today's verse is set")
  }

  async function toggleMemorized(target: MemoryVerse) {
    const memorized = !target.memorized
    const apply = (v: MemoryVerse) => (v.id === target.id ? { ...v, memorized } : v)
    setVerse(v => (v ? apply(v) : v))
    setHistory(h => h.map(apply))

    const { error } = await supabase
      .from('memory_verses')
      .update({ memorized, updated_at: new Date().toISOString() })
      .eq('id', target.id)
    if (error) {
      toast.error("Couldn't update. Check your connection.")
      const revert = (v: MemoryVerse) => (v.id === target.id ? { ...v, memorized: target.memorized } : v)
      setVerse(v => (v ? revert(v) : v))
      setHistory(h => h.map(revert))
    } else if (memorized) {
      toast.success('Hidden in your heart 🙏')
    }
  }

  function copy(v: MemoryVerse) {
    navigator.clipboard.writeText(`"${v.text}" — ${v.reference}`)
    toast.success('Verse copied')
  }

  const lastVerse = history[0]
  const memorizedCount = history.filter(v => v.memorized).length + (verse?.memorized ? 1 : 0)

  if (loading) {
    return <div className="rounded-lg border bg-background p-4 h-32 animate-pulse" />
  }

  return (
    <div className="rounded-lg border bg-background p-4 w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-violet-500" />
          Memory Verse
        </p>
        {memorizedCount > 0 && (
          <span className="text-[11px] text-muted-foreground">{memorizedCount} memorized</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Reference, e.g. Psalm 119:11"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookUp() } }}
              className="flex-1"
              autoFocus
            />
            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="border rounded-md px-2 text-sm bg-background"
              aria-label="Translation"
            >
              {LOOKUP_TRANSLATIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <Button size="icon" variant="outline" onClick={lookUp} disabled={lookingUp || !reference.trim()} title="Look up verse">
              {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Verse text (look it up or type it)"
            className="w-full min-h-[90px] rounded-md border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-violet-500"
          />

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="accent-violet-600" />
            Share with my partner
          </label>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => save()} disabled={saving || !reference.trim() || !text.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save verse
            </Button>
          </div>
        </div>
      ) : verse ? (
        <div className="space-y-3">
          <button
            onClick={() => setLevel(l => NEXT_LEVEL[l])}
            className="w-full text-left rounded-md bg-violet-500/10 px-4 py-3"
            title="Tap to practise"
          >
            <p className="text-base leading-relaxed font-medium italic">
              <PracticeText text={verse.text} level={level} />
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              {verse.reference}
              {verse.translation && <span className="text-muted-foreground"> · {verse.translation.toUpperCase()}</span>}
            </p>
          </button>
          <p className="text-[11px] text-muted-foreground">
            {level === 'full' ? 'Tap the verse to practise: first letters, then blanks.' : level === 'hints' ? 'First letters only. Tap again to hide all.' : 'Say it from memory, then tap to check.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={verse.memorized ? 'default' : 'outline'}
              onClick={() => toggleMemorized(verse)}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {verse.memorized ? 'Memorized' : 'I know it'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLevel(level === 'full' ? 'hidden' : 'full')} className="gap-1.5">
              {level === 'full' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {level === 'full' ? 'Hide' : 'Show'}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => copy(verse)} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => startEditing(verse)} title="Change verse">
              <Pencil className="h-4 w-4" />
            </Button>
            {verse.visibility === 'shared' && (
              <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Shared
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Choose a verse to carry with you today.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => startEditing()}>Choose today&apos;s verse</Button>
            {partnerVerse && (
              <Button size="sm" variant="outline" onClick={() => save({
                reference: partnerVerse.reference,
                text: partnerVerse.text,
                translation: partnerVerse.translation,
                visibility: 'shared',
              })} disabled={saving}>
                Use {partnerName}&apos;s verse
              </Button>
            )}
            {lastVerse && !lastVerse.memorized && (
              <Button size="sm" variant="outline" onClick={() => save({
                reference: lastVerse.reference,
                text: lastVerse.text,
                translation: lastVerse.translation,
                visibility: lastVerse.visibility,
              })} disabled={saving}>
                Keep {lastVerse.reference}
              </Button>
            )}
          </div>
        </div>
      )}

      {partnerVerse && (
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {partnerName}&apos;s verse today
            {partnerVerse.memorized && <Check className="h-3 w-3 text-emerald-500 ml-1" />}
          </p>
          <p className="text-sm mt-1 italic line-clamp-3">&ldquo;{partnerVerse.text}&rdquo;</p>
          <p className="text-[11px] font-semibold mt-1">{partnerVerse.reference}</p>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(s => !s)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Past verses ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 divide-y border rounded-md">
              {history.map(v => (
                <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.reference}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{formatDay(v.day)} · {v.text}</p>
                  </div>
                  <button
                    onClick={() => toggleMemorized(v)}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${v.memorized ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}
                    title={v.memorized ? 'Memorized' : 'Mark as memorized'}
                  >
                    {v.memorized && <Check className="h-3 w-3 text-white" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
