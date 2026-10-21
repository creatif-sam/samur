'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HeartHandshake, Loader2, Pencil, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'
import { Modal } from '@/components/planner/tasks/Modal'

type Checkin = { id: string; user_id: string; week_start: string; wins: string; struggles: string; prayer: string }

const PROMPTS: { key: 'wins' | 'struggles' | 'prayer'; label: string; placeholder: string }[] = [
  { key: 'wins', label: 'Wins this week', placeholder: 'What went well? What are you thankful for?' },
  { key: 'struggles', label: 'Struggles', placeholder: 'Where did you fall short or feel stuck?' },
  { key: 'prayer', label: 'Pray for me', placeholder: 'What should your partner pray about next week?' },
]

// Monday of the current week
function weekStartKey(today: Date) {
  const key = toLocalDateKey(today)
  const offset = (today.getDay() + 6) % 7
  return addDays(key, -offset)
}

// Weekly accountability: both partners answer three prompts, then see each other's
export default function PartnerCheckinCard({ userId }: { userId: string | null }) {
  const supabase = createClient()
  const now = new Date()
  const week = weekStartKey(now)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [mine, setMine] = useState<Checkin | null>(null)
  const [theirs, setTheirs] = useState<Checkin | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [form, setForm] = useState({ wins: '', struggles: '', prayer: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: profile } = await supabase.from('profiles').select('partner_id').eq('id', userId).maybeSingle()
      const pid = profile?.partner_id ?? null
      setPartnerId(pid)
      if (!pid) return
      const [{ data, error }, { data: p }] = await Promise.all([
        supabase.from('partner_checkins').select('*').in('user_id', [userId, pid]).eq('week_start', week),
        supabase.from('profiles').select('name').eq('id', pid).maybeSingle(),
      ])
      if (error) { setUnavailable(true); return }
      if (p?.name) setPartnerName(p.name)
      const rows = (data ?? []) as Checkin[]
      setMine(rows.find(r => r.user_id === userId) ?? null)
      setTheirs(rows.find(r => r.user_id === pid) ?? null)
    })()
  }, [userId, week])

  // Only for partners; shown from Friday, or any day once someone has shared
  const dayOfWeek = now.getDay()
  const isCheckinTime = dayOfWeek === 0 || dayOfWeek >= 5
  if (!userId || !partnerId || unavailable) return null
  if (!isCheckinTime && !mine && !theirs) return null

  function startEdit() {
    setForm({ wins: mine?.wins ?? '', struggles: mine?.struggles ?? '', prayer: mine?.prayer ?? '' })
    setOpen(true)
  }

  async function save() {
    if (!userId || !Object.values(form).some(v => v.trim())) return
    setSaving(true)
    const { data, error } = await supabase
      .from('partner_checkins')
      .upsert({ user_id: userId, week_start: week, ...form, updated_at: new Date().toISOString() }, { onConflict: 'user_id,week_start' })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error(error.message || "Couldn't share your check-in"); return }
    const firstTime = !mine
    setMine(data as Checkin)
    setOpen(false)
    toast.success(firstTime ? 'Check-in shared 🤝' : 'Check-in updated')
    if (firstTime && partnerId) {
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: partnerId,
          type: 'message',
          title: 'Weekly check-in 🤝',
          body: 'Your partner shared their weekly check-in. Share yours to see it.',
          url: '/protected',
        }),
      }).catch(() => {})
    }
  }

  const weekLabel = parseDateKey(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <>
      <div className="rounded-3xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-500" />
          <p className="text-sm font-black flex-1">Weekly check-in</p>
          <span className="text-[10px] text-muted-foreground">Week of {weekLabel}</span>
        </div>
        {!mine ? (
          <>
            <p className="text-xs text-muted-foreground">
              {theirs ? `${partnerName} has shared theirs. Share yours to see it.` : `Share your wins, struggles and prayer needs with ${partnerName}.`}
            </p>
            <button onClick={startEdit} className="w-full rounded-2xl bg-rose-500 text-white py-2.5 text-sm font-bold active:scale-[0.98]">
              Share my check-in
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setViewing(true)}
              disabled={!theirs}
              className="flex-1 rounded-2xl bg-rose-500 text-white py-2.5 text-sm font-bold disabled:opacity-50 active:scale-[0.98]"
            >
              {theirs ? `Read ${partnerName}'s` : `Waiting for ${partnerName}`}
            </button>
            <button onClick={startEdit} aria-label="Edit my check-in" className="rounded-2xl border border-border px-3 text-muted-foreground">
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="w-full max-w-md mx-auto bg-background rounded-[28px] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">Weekly check-in</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {PROMPTS.map(prompt => (
              <div key={prompt.key} className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{prompt.label}</label>
                <textarea
                  value={form[prompt.key]}
                  onChange={e => setForm(f => ({ ...f, [prompt.key]: e.target.value }))}
                  placeholder={prompt.placeholder}
                  rows={3}
                  className="w-full rounded-2xl border bg-muted/30 px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>
            ))}
            <button
              onClick={save}
              disabled={saving || !Object.values(form).some(v => v.trim())}
              className="w-full rounded-2xl bg-rose-500 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Share with {partnerName}
            </button>
          </div>
        </Modal>
      )}

      {viewing && theirs && (
        <Modal onClose={() => setViewing(false)}>
          <div className="w-full max-w-md mx-auto bg-background rounded-[28px] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">{partnerName}&apos;s week</p>
              <button onClick={() => setViewing(false)} className="p-1.5 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {PROMPTS.map(prompt => theirs[prompt.key]?.trim() && (
              <div key={prompt.key} className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-rose-500">{prompt.label}</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{theirs[prompt.key]}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
