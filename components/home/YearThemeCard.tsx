'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crown, Sparkles } from 'lucide-react'
import { parseDateKey, toLocalDateKey } from '@/lib/dates'
import { EMPTY_THEMES, currentMonthTheme, loadThemes, themeSpan, type Themes } from '@/lib/themes'

// Time walked in the theme, counted from the day it began (which may be before Jan 1)
function elapsedSince(startKey: string) {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - parseDateKey(startKey).getTime()) / 60000))
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
  }
}

export default function YearThemeCard() {
  const [themes, setThemes] = useState<Themes>(EMPTY_THEMES)
  const [, setTick] = useState(0)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setThemes((await loadThemes(supabase, user.id)).themes)
    }
    load()
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const { yearTheme, yearScripture } = themes
  // Last month's theme stops showing when a new month begins
  const { theme: monthTheme, scripture: monthScripture } = currentMonthTheme(themes)
  if (!yearTheme && !monthTheme) return null

  const span = themeSpan(themes.themeYear, themes.themeStart, toLocalDateKey(new Date()))
  const elapsed = elapsedSince(span.start)
  const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long' })

  return (
    <div className="mx-4 mt-4 space-y-3">
      {/* ── Year theme ── */}
      {yearTheme && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#A78BFA] p-5">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative">
            {/* Header row: icon + label + live timer */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 truncate">
                  Theme of the Year &middot; {span.year}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-xl px-2.5 py-1 shrink-0">
                <span className="text-[9px] font-black text-white/70 tabular-nums tracking-wide">
                  {span.status === 'upcoming'
                    ? `in ${span.daysUntil}d`
                    : span.status === 'ended'
                      ? 'completed'
                      : `${elapsed.days}d ${String(elapsed.hours).padStart(2, '0')}h ${String(elapsed.minutes).padStart(2, '0')}m`}
                </span>
              </div>
            </div>

            <p className="text-white font-black text-xl leading-tight uppercase tracking-wide">
              {yearTheme}
            </p>
            {yearScripture && (
              <p className="text-white/70 text-xs italic mt-1.5">{yearScripture}</p>
            )}
            {span.earlyStart && span.status === 'active' && (
              <p className="mt-2 text-[10px] font-bold text-amber-200/90">
                Given early · since {parseDateKey(span.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Month theme ── */}
      {monthTheme && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 p-5">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Theme of the Month &middot; {currentMonth}
              </span>
            </div>
            <p className="text-white font-black text-xl leading-tight uppercase tracking-wide">
              {monthTheme}
            </p>
            {monthScripture && (
              <p className="text-white/70 text-xs italic mt-1.5">{monthScripture}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
