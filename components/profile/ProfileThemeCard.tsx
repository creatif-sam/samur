'use client'

import { useState } from 'react'
import { Crown, Pencil, Save, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toLocalDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { currentMonthTheme, formatThemeDate, monthKey, themeSpan, type Themes } from '@/lib/themes'

interface Props {
  themes: Themes
  saving: boolean
  onSave: (next: Themes) => Promise<boolean>
}

// "Isaiah 43:19 — Behold, I am doing a new thing" → reference + words
export function splitScripture(raw: string) {
  const text = raw.trim()
  const m = text.match(/^(.{2,40}?\d+[:.]\d+(?:[-–]\d+)?)\s*[—–-]\s*(.+)$/)
  if (m) return { ref: m[1].trim(), words: m[2].trim() }
  const tail = text.match(/^(.+?)\s*[—–-]\s*(.{2,40}?\d+[:.]\d+(?:[-–]\d+)?)$/)
  if (tail) return { ref: tail[2].trim(), words: tail[1].trim() }
  return { ref: '', words: text }
}

function Scripture({ value, tone }: { value: string; tone: 'gold' | 'cyan' }) {
  const { ref, words } = splitScripture(value)
  return (
    <div className="mt-3">
      {words && <p className="font-serif text-[15px] italic leading-relaxed text-white/85">&ldquo;{words.replace(/^["“]|["”]$/g, '')}&rdquo;</p>}
      {ref && (
        <p className={cn('mt-1.5 text-[11px] font-bold uppercase tracking-widest', tone === 'gold' ? 'text-amber-300' : 'text-cyan-200')}>
          {ref}
        </p>
      )}
    </div>
  )
}

const inputCls = 'w-full h-10 px-3 rounded-xl border border-border bg-muted/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500'
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5'
const chipCls = (on: boolean) => cn(
  'rounded-full px-3 py-1.5 text-xs font-bold transition',
  on ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
)

export function ProfileThemeCard({ themes, saving, onSave }: Props) {
  const { yearTheme, yearScripture } = themes
  // A month theme from an earlier month no longer shows
  const month = currentMonthTheme(themes)
  const monthTheme = month.theme
  const monthScripture = month.scripture
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Themes>(themes)
  const todayKey = toLocalDateKey(new Date())
  const thisYear = Number(todayKey.slice(0, 4))
  const span = themeSpan(themes.themeYear, themes.themeStart, todayKey)
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' })
  const hasAny = !!(yearTheme || themes.monthTheme)

  // Draft year and start, with the defaults filled in so the editor always shows real values
  const draftYear = draft.themeYear ?? thisYear
  const draftStart = draft.themeStart ?? `${draftYear}-01-01`
  const startProblem = draftStart > `${draftYear}-12-31` ? `The start must be on or before Dec 31, ${draftYear}.` : null
  const yearOptions = [...new Set([thisYear, thisYear + 1, draftYear])].sort()

  const startEdit = () => {
    // Start the month theme fresh when the saved one belongs to an earlier month
    setDraft(month.stale ? { ...themes, monthTheme: '', monthScripture: '' } : themes)
    setEditing(true)
  }
  const setDraftYear = (y: number) =>
    setDraft(d => {
      // Keep a custom start only if it still fits the new year; otherwise go back to Jan 1
      const start = d.themeStart && d.themeStart <= `${y}-12-31` ? d.themeStart : null
      return { ...d, themeYear: y, themeStart: start }
    })
  const save = async () => {
    if (startProblem) return
    const next: Themes = {
      ...draft,
      // Store the plain calendar defaults as null, so they keep following the calendar
      themeYear: draftYear,
      themeStart: draftStart === `${draftYear}-01-01` ? null : draftStart,
      themeMonth: draft.monthTheme.trim() ? monthKey(todayKey) : null,
    }
    if (await onSave(next)) setEditing(false)
  }

  if (editing) {
    return (
      <section className="mb-6 rounded-3xl bg-background p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </span>
            <h2 className="text-base font-black">Your themes</h2>
          </div>
          <button onClick={() => setEditing(false)} aria-label="Cancel" className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400">Theme of the year</p>
          <div>
            <p className={labelCls}>For the year</p>
            <div className="flex flex-wrap gap-1.5">
              {yearOptions.map(y => (
                <button key={y} type="button" onClick={() => setDraftYear(y)} className={chipCls(draftYear === y)}>{y}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={labelCls}>Theme</p>
            <input value={draft.yearTheme} onChange={e => setDraft(d => ({ ...d, yearTheme: e.target.value }))} placeholder="e.g. Year of Excellence" className={inputCls} maxLength={80} />
          </div>
          <div>
            <p className={labelCls}>Scripture</p>
            <Textarea value={draft.yearScripture} onChange={e => setDraft(d => ({ ...d, yearScripture: e.target.value }))} placeholder="Isaiah 43:19 — Behold, I am doing a new thing" className="text-sm resize-none rounded-xl" rows={2} />
          </div>
          <div>
            <p className={labelCls}>Walking in it since</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setDraft(d => ({ ...d, themeStart: null }))} className={chipCls(draftStart === `${draftYear}-01-01`)}>
                Jan 1, {draftYear}
              </button>
              {todayKey <= `${draftYear}-12-31` && todayKey !== `${draftYear}-01-01` && (
                <button type="button" onClick={() => setDraft(d => ({ ...d, themeStart: todayKey }))} className={chipCls(draftStart === todayKey)}>
                  Today
                </button>
              )}
            </div>
            <input
              type="date"
              value={draftStart}
              max={`${draftYear}-12-31`}
              onChange={e => e.target.value && setDraft(d => ({ ...d, themeStart: e.target.value }))}
              className={inputCls}
            />
            <p className={cn('mt-1.5 text-[11px]', startProblem ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
              {startProblem ?? 'When the Spirit gives it early, start before January. The theme runs to Dec 31.'}
            </p>
          </div>

          <div className="h-px bg-border/60 my-2" />

          <p className="text-xs font-black text-cyan-600 dark:text-cyan-400">Theme of {monthName}</p>
          <div>
            <p className={labelCls}>Theme</p>
            <input value={draft.monthTheme} onChange={e => setDraft(d => ({ ...d, monthTheme: e.target.value }))} placeholder="e.g. Month of Deep Prayer" className={inputCls} maxLength={80} />
          </div>
          <div>
            <p className={labelCls}>Scripture</p>
            <Textarea value={draft.monthScripture} onChange={e => setDraft(d => ({ ...d, monthScripture: e.target.value }))} placeholder="Philippians 4:13 — I can do all things through Christ" className="text-sm resize-none rounded-xl" rows={2} />
          </div>
          <p className="text-[11px] text-muted-foreground">Write the reference, a dash, then the words, and they&apos;ll be laid out nicely.</p>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1 h-10 gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={save} disabled={saving || !!startProblem}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save themes'}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (!hasAny) {
    return (
      <button
        onClick={startEdit}
        className="mb-6 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-amber-300/70 bg-amber-50/60 p-5 text-left transition active:scale-[0.99] dark:border-amber-500/30 dark:bg-amber-500/5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
          <Crown className="h-6 w-6 text-white" />
        </span>
        <span>
          <span className="block text-base font-black">Declare your theme for the year</span>
          <span className="block text-xs text-muted-foreground mt-0.5">A word and a scripture to carry you. Start whenever it&apos;s given, even before January.</span>
        </span>
      </button>
    )
  }

  return (
    <section className="mb-6 overflow-hidden rounded-3xl shadow-xl shadow-violet-900/20">
      {/* Year */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] p-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-3xl" aria-hidden />

        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
              <Crown className="h-3.5 w-3.5 text-amber-300" /> Theme of {span.year}
            </span>
            <button onClick={startEdit} aria-label="Edit themes" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          {yearTheme ? (
            <>
              <h2 className="mt-3 font-serif text-[28px] font-bold leading-[1.15] tracking-tight">{yearTheme}</h2>
              {yearScripture && <Scripture value={yearScripture} tone="gold" />}
            </>
          ) : (
            <button onClick={startEdit} className="mt-3 text-left text-lg font-bold text-white/70 underline decoration-dashed underline-offset-4">
              Set your theme for the year
            </button>
          )}

          {yearTheme && span.earlyStart && span.status === 'active' && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-[11px] font-bold text-amber-200">
              <Sparkles className="h-3 w-3" /> Given early · since {formatThemeDate(span.start)}
            </p>
          )}

          {/* Walk through the theme's year */}
          {yearTheme && (
            <div className="mt-4">
              {span.status === 'upcoming' ? (
                <p className="text-xs font-semibold text-white/75">
                  Begins {formatThemeDate(span.start)} · in {span.daysUntil} day{span.daysUntil === 1 ? '' : 's'}
                </p>
              ) : span.status === 'ended' ? (
                <button onClick={startEdit} className="text-left text-xs font-semibold text-white/80">
                  Completed on {formatThemeDate(span.end)}. <span className="underline underline-offset-2">Set your next theme</span>
                </button>
              ) : (
                <>
                  <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/60">
                    <span>Day {span.day} of {span.totalDays}</span>
                    <span>{span.daysLeft} days left</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-400" style={{ width: `${span.pct}%` }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Month */}
      <div className="relative bg-gradient-to-br from-[#0e7490] to-[#0f766e] px-6 py-5 text-white">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/90">
          <Sparkles className="h-3.5 w-3.5 text-cyan-200" /> Theme of {monthName}
        </span>
        {monthTheme ? (
          <>
            <p className="mt-2 font-serif text-xl font-bold leading-snug">{monthTheme}</p>
            {monthScripture && <Scripture value={monthScripture} tone="cyan" />}
          </>
        ) : (
          <>
            <button onClick={startEdit} className="mt-2 block text-left text-sm font-bold text-white/85 underline decoration-dashed underline-offset-4">
              Set a theme for {monthName}
            </button>
            {month.previous && <p className="mt-1.5 text-[11px] text-white/60">Last month: {month.previous}</p>}
          </>
        )}
      </div>
    </section>
  )
}
