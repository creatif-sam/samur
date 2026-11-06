'use client'

import { useState } from 'react'
import { Check, Moon, Target, X, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toLocalDateKey } from '@/lib/dates'
import { endedNow, formatDuration, hoursFromMinutes, minutesBetween, WORK_TYPES, type WorkType } from '@/lib/create'

export interface FormValues {
  date: string
  start: string
  end: string
  workedOn: string
  produced: string
  workType: WorkType
  aligned: boolean | null
  focused: boolean | null
  notes: string
}

export const emptyForm = (): FormValues => ({
  date: toLocalDateKey(new Date()),
  start: '',
  end: '',
  workedOn: '',
  produced: '',
  workType: 'creation',
  aligned: null,
  focused: null,
  notes: '',
})

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120]
const label = 'px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground'

// Yes / No, optional: tap the chosen one again to clear it
function YesNo({ icon, text, value, onChange }: { icon: React.ReactNode; text: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">{icon}<span className="leading-tight">{text}</span></span>
      <div className="flex shrink-0 gap-1 rounded-xl bg-background p-1 ring-1 ring-border">
        {([true, false] as const).map(v => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(value === v ? null : v)}
            className={cn(
              'h-8 min-w-[44px] rounded-lg px-2.5 text-xs font-bold transition',
              value === v ? (v ? 'bg-emerald-600 text-white' : 'bg-foreground text-background') : 'text-muted-foreground',
            )}
          >
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  title: string
  mode: 'new' | 'timer' | 'edit'
  initial: FormValues
  recent: string[]
  saving: boolean
  onSave: (values: FormValues, minutes: number) => void
  onCancel: () => void
}

export default function CreateForm({ title, mode, initial, recent, saving, onSave, onCancel }: Props) {
  const [v, setV] = useState<FormValues>(initial)
  const set = <K extends keyof FormValues>(k: K, value: FormValues[K]) => setV(prev => ({ ...prev, [k]: value }))

  const minutes = v.start && v.end ? minutesBetween(v.start, v.end) : null
  const overnight = minutes !== null && v.end < v.start
  const long = minutes !== null && minutes > 12 * 60
  const sameTimes = !!v.start && !!v.end && v.start === v.end
  const valid = v.workedOn.trim().length > 0 && minutes !== null

  const applyQuick = (mins: number) => {
    const t = endedNow(mins)
    setV(prev => ({ ...prev, date: t.date, start: t.start, end: t.end }))
  }

  return (
    <section className="rounded-3xl border border-violet-500/30 bg-card p-5 shadow-lg shadow-violet-500/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
          {mode === 'timer' && <p className="text-xs text-muted-foreground">Times came from your timer. Add the details.</p>}
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* What */}
        <div className="space-y-2">
          <p className={label}>What did you work on?</p>
          <Input
            value={v.workedOn}
            onChange={e => set('workedOn', e.target.value)}
            placeholder="Project or task"
            className="h-12 text-base font-medium"
            autoFocus={mode !== 'timer'}
          />
          {recent.length > 0 && !v.workedOn && (
            <div className="flex flex-wrap gap-1.5">
              {recent.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => set('workedOn', name)}
                  className="max-w-full truncate rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80 active:scale-95"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className={label}>What did it produce? <span className="font-medium normal-case tracking-normal">(optional)</span></p>
          <Input value={v.produced} onChange={e => set('produced', e.target.value)} placeholder="A chapter, a design, a finished list…" />
        </div>

        {/* When */}
        <div className="space-y-2">
          <p className={label}>When</p>
          {mode === 'new' && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {QUICK_MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyQuick(m)}
                  className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-bold active:scale-95"
                >
                  {formatDuration(m / 60)} ago
                </button>
              ))}
            </div>
          )}
          <Input type="date" value={v.date} max={toLocalDateKey(new Date())} onChange={e => set('date', e.target.value)} aria-label="Date" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Input type="time" value={v.start} onChange={e => set('start', e.target.value)} aria-label="Start time" />
            <span className="text-xs font-bold text-muted-foreground">to</span>
            <Input type="time" value={v.end} onChange={e => set('end', e.target.value)} aria-label="End time" />
          </div>
          <p
            className={cn(
              'flex items-center gap-1.5 px-1 text-xs font-semibold',
              sameTimes || long ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
            )}
          >
            {sameTimes
              ? 'The start and end are the same time.'
              : minutes === null
                ? 'Set a start and an end time.'
                : (
                  <>
                    <span className="text-foreground">{formatDuration(hoursFromMinutes(minutes))}</span>
                    {overnight && <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> ends the next day</span>}
                    {long && <span>That is a long session. Check the times.</span>}
                  </>
                )}
          </p>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <p className={label}>Type</p>
          <div className="grid grid-cols-3 gap-2">
            {WORK_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={v.workType === t.id}
                onClick={() => set('workType', t.id)}
                className={cn(
                  'h-11 rounded-2xl text-xs font-bold transition active:scale-95',
                  v.workType === t.id ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* How it went */}
        <div className="space-y-2">
          <p className={label}>How did it go? <span className="font-medium normal-case tracking-normal">(optional)</span></p>
          <YesNo icon={<Zap className="h-4 w-4 shrink-0 text-emerald-500" />} text="I stayed focused" value={v.focused} onChange={x => set('focused', x)} />
          <YesNo icon={<Target className="h-4 w-4 shrink-0 text-blue-500" />} text="It moved my vision forward" value={v.aligned} onChange={x => set('aligned', x)} />
        </div>

        <Textarea
          value={v.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Notes or reflection (optional)"
          className="min-h-[88px] resize-none"
        />

        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => minutes !== null && onSave(v, minutes)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition active:scale-[0.98] disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save session'}
        </button>
      </div>
    </section>
  )
}
