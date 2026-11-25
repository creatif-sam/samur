'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass, Mountain, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { HelpTip } from '@/components/ui/help-tip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  GUIDE, MAX_CHARS, lengthNote, loadLifeStatement, saveLifeStatement, withStarter,
  type LifeField, type LifeStatement,
} from '@/lib/lifeStatement'

interface Props {
  // 'goals': full card at the top of Goals & Vision. 'home': compact, and a slim invite when empty.
  variant: 'goals' | 'home'
  // Skips loading; used to preview the card
  seed?: { userId: string; life: LifeStatement; ready?: boolean }
}

// Your life mission and life vision: the "why" and the "where" above every vision and goal
export default function LifeStatementCard({ variant, seed }: Props) {
  const { tr } = useTranslation()
  const [userId, setUserId] = useState<string | null>(seed?.userId ?? null)
  const [life, setLife] = useState<LifeStatement | null>(seed?.life ?? null)
  const [ready, setReady] = useState(seed?.ready ?? true)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (seed) return
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const res = await loadLifeStatement(supabase, user.id)
      setLife(res.life)
      setReady(res.ready)
    })()
  }, [seed])

  if (!life || !userId) return null
  const empty = !life.mission && !life.vision
  const home = variant === 'home'
  // On Home, long statements fold to a few lines with a "Read all" link
  const long = life.mission.length + life.vision.length > 260

  const editor = (
    <LifeStatementEditor
      open={editing}
      initial={life}
      userId={userId}
      ready={ready}
      onClose={() => setEditing(false)}
      onSaved={next => { setLife(next); setEditing(false) }}
    />
  )

  if (empty) {
    return (
      <div className={home ? 'mx-4 mt-4' : ''}>
        {home ? (
          <Link href="/protected/goals" className="flex items-center gap-3 rounded-2xl border border-dashed border-violet-300 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3 active:scale-[0.99] transition">
            <Compass className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
            <span className="min-w-0 flex-1 text-sm font-semibold">{tr('Write your life mission and vision')}</span>
            <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </Link>
        ) : (
          <button onClick={() => setEditing(true)} className="w-full rounded-2xl border border-dashed border-violet-300 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 p-4 text-left active:scale-[0.99] transition">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <Compass className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tr('Life mission & vision')}</span>
            </div>
            <p className="mt-2 text-sm font-semibold">{tr('Start with why. Write the mission and vision your goals serve.')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tr('Your mission is why you exist; your vision is the future you are building.')}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5" />{' '}{tr('Write them')}
            </span>
          </button>
        )}
        {editor}
      </div>
    )
  }

  return (
    <div className={home ? 'mx-4 mt-4' : ''}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-5 text-white shadow-lg shadow-indigo-950/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" />
        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{tr('Life mission & vision')}</span>
              {!home && <HelpTip topic="goals.life" align="left" tone="onDark" className="-my-1" />}
            </div>
            <button onClick={() => setEditing(true)} aria-label={tr('Edit life mission and vision')} className="-m-1 grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10">
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`space-y-4 ${home && long && !expanded ? 'max-h-48 overflow-hidden' : ''}`}
            style={home && long && !expanded ? { maskImage: 'linear-gradient(to bottom, black 65%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent)' } : undefined}
          >
            <Statement icon={<Compass className="h-3.5 w-3.5 text-amber-300" />} label={tr('Mission')} text={life.mission} onAdd={() => setEditing(true)} />
            <Statement icon={<Mountain className="h-3.5 w-3.5 text-sky-300" />} label={tr('Vision')} text={life.vision} onAdd={() => setEditing(true)} />
          </div>
          {home && long && (
            <button onClick={() => setExpanded(e => !e)} className="mt-2 text-[11px] font-bold text-white/70 underline-offset-2 hover:underline">
              {expanded ? tr('Show less') : tr('Read all')}
            </button>
          )}
        </div>
      </div>
      {editor}
    </div>
  )
}

function Statement({ icon, label, text, onAdd }: { icon: React.ReactNode; label: string; text: string; onAdd: () => void }) {
  const { tr } = useTranslation()
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white/15">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{tr(label)}</span>
      </div>
      {text ? (
        <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-white/95">{text}</p>
      ) : (
        <button onClick={onAdd} className="text-sm font-semibold text-white/60 underline-offset-2 hover:underline">
          {tr('Add your {toLowerCase}', { toLowerCase: label.toLowerCase() })}
        </button>
      )}
    </div>
  )
}

function LifeStatementEditor({ open, initial, userId, ready, onClose, onSaved }: {
  open: boolean
  initial: LifeStatement
  userId: string
  ready: boolean
  onClose: () => void
  onSaved: (life: LifeStatement) => void
}) {
  const { tr } = useTranslation()
  const [draft, setDraft] = useState<Record<LifeField, string>>({ mission: initial.mission, vision: initial.vision })
  const [saving, setSaving] = useState(false)

  // Start from what's saved each time the editor opens
  useEffect(() => {
    if (open) setDraft({ mission: initial.mission, vision: initial.vision })
  }, [open, initial])

  const changed = draft.mission.trim() !== initial.mission || draft.vision.trim() !== initial.vision

  const save = async () => {
    setSaving(true)
    const { result, life } = await saveLifeStatement(createClient(), userId, draft.mission, draft.vision)
    setSaving(false)
    if (result === 'ok' && life) {
      toast.success(tr('Saved'))
      onSaved(life)
    } else if (result === 'needs-update') {
      toast.error(tr('The database needs an update first: run the life mission migration in Supabase.'))
    } else {
      toast.error(tr('Couldn\'t save. Check your connection and try again.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black text-xl tracking-tight">{tr('Life mission & vision')}</DialogTitle>
          <DialogDescription>{tr('Your why and your where. Every role and goal sits under these.')}</DialogDescription>
        </DialogHeader>

        {!ready && (
          <p className="rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200">
            {tr('Saving needs a quick database update (the life mission migration) before it will work.')}
          </p>
        )}

        <div className="space-y-6">
          {(['mission', 'vision'] as const).map(field => (
            <FieldEditor
              key={field}
              field={field}
              value={draft[field]}
              onChange={v => setDraft(d => ({ ...d, [field]: v }))}
            />
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-border text-sm font-semibold">
            {tr('Cancel')}
          </button>
          <button onClick={save} disabled={saving || !changed} className="h-11 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50">
            {saving ? tr('Saving…') : tr('Save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldEditor({ field, value, onChange }: { field: LifeField; value: string; onChange: (v: string) => void }) {
  const { tr } = useTranslation()
  const g = GUIDE[field]
  const note = lengthNote(field, value)
  const id = `life-${field}`
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        {field === 'mission' ? <Compass className="h-3.5 w-3.5" /> : <Mountain className="h-3.5 w-3.5" />}
        {tr(g.label)}
      </label>
      <p className="mt-1 text-sm font-semibold">{tr(g.question)}</p>
      <p className="text-xs text-muted-foreground">{tr(g.hint)}</p>

      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={MAX_CHARS}
        rows={field === 'mission' ? 3 : 4}
        placeholder={tr(g.example)}
        className="mt-2 w-full resize-y rounded-xl border border-border bg-muted/30 px-3 py-2.5 font-serif text-[15px] leading-relaxed outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
      />

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {!value.trim() && (
          <button type="button" onClick={() => onChange(withStarter(field, value))} className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
            {tr('Start with: “{starter}”', { starter: g.starter })}
          </button>
        )}
      </div>
      {note && <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">{note}</p>}

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold">{tr('Questions to help you')}</summary>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {g.prompts.map(p => <li key={p}>{p}</li>)}
        </ul>
      </details>
    </div>
  )
}
