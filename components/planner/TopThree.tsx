'use client'

import { useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Check, Plus, X } from 'lucide-react'
import { HelpTip } from '@/components/ui/help-tip'
import { MAX_PRIORITIES, type Priority } from '@/lib/planner/top3'

export type PrioritySuggestion = { key: string; text: string; rock_id?: string; todo_id?: string; hint?: string }

// The day's three most important things. In the morning card they are chosen
// (typed, or picked from the week's rocks and the day's events); in the evening card ticked off.
export default function TopThree({ items, mode, suggestions = [], disabled, onAdd, onToggle, onRemove }: {
  items: Priority[]
  mode: 'plan' | 'review'
  suggestions?: PrioritySuggestion[]
  disabled?: boolean
  onAdd?: (item: { text: string; rock_id?: string; todo_id?: string }) => void
  onToggle: (id: string) => void
  onRemove?: (id: string) => void
}) {
  const { tr } = useTranslation()
  const [draft, setDraft] = useState('')
  const full = items.length >= MAX_PRIORITIES
  const done = items.filter(p => p.done).length
  const taken = new Set(items.flatMap(p => [p.text.toLowerCase(), p.rock_id, p.todo_id].filter(Boolean) as string[]))
  const offered = suggestions.filter(s => !taken.has(s.text.toLowerCase()) && !(s.rock_id && taken.has(s.rock_id)) && !(s.todo_id && taken.has(s.todo_id))).slice(0, 4)

  if (mode === 'review' && items.length === 0) return null

  function add() {
    const text = draft.trim()
    if (!text || full) return
    onAdd?.({ text })
    setDraft('')
  }

  return (
    <div className="mt-3 border-t border-white/20 pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {mode === 'review' ? tr('Top 3: {done} of {total} done', { done, total: items.length }) : tr('Top 3 for today')}
        </span>
        {mode === 'plan' && <HelpTip topic="planner.top3" tone="onDark" align="left" className="-my-1" />}
      </div>

      <ul className="space-y-1.5">
        {items.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2.5">
            <button
              onClick={() => onToggle(p.id)}
              disabled={disabled}
              aria-label={p.done ? tr('Mark not done') : tr('Mark done')}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${p.done ? 'border-white bg-white' : 'border-white/60'}`}
            >
              {p.done ? <Check className="h-3 w-3 stroke-[3] text-slate-700" /> : <span className="text-[10px] font-black text-white/80">{i + 1}</span>}
            </button>
            <span className={`min-w-0 flex-1 text-[15px] font-semibold text-white ${p.done ? 'line-through opacity-60' : ''}`}>{p.text}</span>
            {mode === 'plan' && onRemove && (
              <button onClick={() => onRemove(p.id)} disabled={disabled} aria-label={tr('Remove')} className="shrink-0 rounded-full p-1 text-white/60 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {mode === 'plan' && !full && (
        <>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={draft}
              disabled={disabled}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder={tr('Add a priority')}
              maxLength={200}
              className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-[16px] font-semibold text-white outline-none placeholder:text-white/50 focus:border-white/60"
            />
            <button
              onClick={add}
              disabled={disabled || !draft.trim()}
              aria-label={tr('Add')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25 text-white active:scale-95 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {offered.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offered.map(s => (
                <button
                  key={s.key}
                  onClick={() => onAdd?.({ text: s.text, rock_id: s.rock_id, todo_id: s.todo_id })}
                  disabled={disabled}
                  className="max-w-full truncate rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white active:scale-95"
                >
                  + {s.hint ? `${s.hint} ` : ''}{s.text}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
