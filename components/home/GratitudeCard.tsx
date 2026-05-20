'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Entry {
  id: string
  entry_1: string
  entry_2: string
  entry_3: string
  date: string
}

export default function GratitudeCard() {
  const supabase = createClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const [entry, setEntry] = useState<Entry | null>(null)
  const [draft, setDraft] = useState(['', '', ''])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Entry[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (data) {
      setEntry(data)
      setDraft([data.entry_1, data.entry_2, data.entry_3])
    } else {
      setExpanded(true) // auto-expand when empty so user sees the prompts
    }
    setLoading(false)
  }

  async function save() {
    const [e1, e2, e3] = draft.map(s => s.trim())
    if (!e1 && !e2 && !e3) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = { user_id: user.id, date: todayStr, entry_1: e1, entry_2: e2, entry_3: e3 }

    const { data, error } = entry
      ? await supabase.from('gratitude_entries').update({ entry_1: e1, entry_2: e2, entry_3: e3 }).eq('id', entry.id).select().single()
      : await supabase.from('gratitude_entries').insert(payload).select().single()

    if (!error && data) {
      setEntry(data)
      setExpanded(false)
      toast.success('Gratitude saved 🙏')
    }
    setSaving(false)
  }

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .neq('date', todayStr)
      .order('date', { ascending: false })
      .limit(10)
    setHistory(data ?? [])
    setShowHistory(true)
  }

  if (loading) return null

  const prompts = [
    'Something that made me smile today…',
    'Someone I\'m grateful for…',
    'A blessing I almost overlooked…',
  ]

  return (
    <div className="mx-4 mt-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-400/20 dark:bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Daily Gratitude</p>
            {entry && !expanded ? (
              <p className="text-sm font-semibold text-foreground line-clamp-1">{entry.entry_1 || '—'}</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">3 things you're grateful for</p>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Inputs */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">{i + 1}.</p>
              <input
                value={draft[i]}
                onChange={e => {
                  const next = [...draft]
                  next[i] = e.target.value
                  setDraft(next)
                }}
                placeholder={prompts[i]}
                className="w-full text-sm bg-white/60 dark:bg-white/5 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-4 py-2.5 outline-none focus:border-amber-400 placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
          ))}
          <button
            onClick={save}
            disabled={saving || draft.every(s => !s.trim())}
            className="w-full h-11 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-sm transition-colors mt-1"
          >
            {saving ? 'Saving…' : entry ? 'Update' : 'Save Gratitude 🙏'}
          </button>

          {!showHistory && (
            <button onClick={loadHistory} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              View past entries
            </button>
          )}
        </div>
      )}

      {/* History */}
      {showHistory && expanded && history.length > 0 && (
        <div className="border-t border-amber-200/50 dark:border-amber-800/30 px-5 pb-5 pt-4 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Past entries</p>
          {history.map(h => (
            <div key={h.id} className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground">
                {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {[h.entry_1, h.entry_2, h.entry_3].filter(Boolean).map((e, i) => (
                <p key={i} className={cn('text-[12px] text-foreground/80 pl-2 border-l-2 border-amber-300 dark:border-amber-700')}>
                  {e}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
