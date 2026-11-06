'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useState } from 'react'
import { Check, Pencil, Target } from 'lucide-react'
import clsx from 'clsx'
import { MAX_TARGET, MIN_TARGET, TARGET_PRESETS } from '@/lib/prayerTarget'

interface Props {
  monthName: string            // 'November'
  target: number               // minutes per day for the viewed month
  carriedFrom: string | null   // month name it was inherited from, when this month has none of its own
  saving: boolean
  onSave: (minutes: number) => Promise<boolean>
}

export default function PrayerTargetControl({ monthName, target, carriedFrom, saving, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(target))

  const parsed = Number(draft)
  const valid = /^\d+$/.test(draft) && parsed >= MIN_TARGET && parsed <= MAX_TARGET
  // Saving the same number is still useful when it was only carried over from an earlier month
  const changed = valid && (parsed !== target || !!carriedFrom)

  const toggle = () => {
    setDraft(String(target))
    setOpen(o => !o)
  }
  const save = async () => {
    if (!changed) return
    if (await onSave(parsed)) setOpen(false)
  }

  return (
    <div className="mb-5 rounded-2xl border border-green-600/25 bg-green-50 dark:bg-green-950/20 dark:border-green-500/20">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-600 text-white">
            <Target className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-green-700 dark:text-green-400">Daily target · {monthName}</span>
            <span className="block text-sm font-black leading-tight text-foreground">{target} min <span className="font-semibold text-muted-foreground">a day</span></span>
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-green-700/70 dark:text-green-400/70" />
        </button>
        <HelpTip topic="prayer.target" />
      </div>

      {open && (
        <div className="space-y-3 border-t border-green-600/15 px-3 pb-3 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {TARGET_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setDraft(String(p))}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95',
                  parsed === p && valid ? 'bg-green-600 text-white' : 'bg-background text-muted-foreground ring-1 ring-border hover:text-foreground',
                )}
              >
                {p}m
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="prayer-target" className="sr-only">Minutes per day</label>
            <input
              id="prayer-target"
              inputMode="numeric"
              value={draft}
              onChange={e => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="h-10 w-24 rounded-xl border border-border bg-background px-3 text-center text-base font-black focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">minutes a day</span>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!changed || saving}
            className="flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-green-600 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> {saving ? 'Saving…' : `Set ${monthName} target`}
          </button>

          <p className={clsx('text-[11px]', draft && !valid ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
            {draft && !valid
              ? `Choose between ${MIN_TARGET} and ${MAX_TARGET} minutes.`
              : carriedFrom
                ? `Carried over from ${carriedFrom}. Setting it here only changes ${monthName} and later months.`
                : `This only changes ${monthName} and later months.`}
          </p>
        </div>
      )}
    </div>
  )
}
