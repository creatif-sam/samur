'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crown, Sparkles } from 'lucide-react'

function useElapsedSinceJan1() {
  const compute = () => {
    const now = new Date()
    const jan1 = new Date(now.getFullYear(), 0, 1)
    const totalMs = now.getTime() - jan1.getTime()
    const totalMinutes = Math.floor(totalMs / 60000)
    return {
      days: Math.floor(totalMinutes / (60 * 24)),
      hours: Math.floor(totalMinutes / 60) % 24,
      minutes: totalMinutes % 60,
    }
  }
  const [elapsed, setElapsed] = useState(compute)
  useEffect(() => {
    const id = setInterval(() => setElapsed(compute()), 60000)
    return () => clearInterval(id)
  }, [])
  return elapsed
}

export default function YearThemeCard() {
  const [yearTheme, setYearTheme]         = useState<string | null>(null)
  const [yearScripture, setYearScripture] = useState<string | null>(null)
  const [monthTheme, setMonthTheme]       = useState<string | null>(null)
  const [monthScripture, setMonthScripture] = useState<string | null>(null)
  const elapsed = useElapsedSinceJan1()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_preferences')
        .select('year_theme, year_scripture, month_theme, month_scripture')
        .eq('user_id', user.id)
        .single()
      if (data?.year_theme)      setYearTheme(data.year_theme)
      if (data?.year_scripture)  setYearScripture(data.year_scripture)
      if (data?.month_theme)     setMonthTheme(data.month_theme)
      if (data?.month_scripture) setMonthScripture(data.month_scripture)
    }
    load()
  }, [])

  if (!yearTheme && !monthTheme) return null

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' })

  return (
    <div className="mx-4 mt-4 space-y-3">
      {/* ── Year theme ── */}
      {yearTheme && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#A78BFA] p-5">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative">
            {/* Header row: icon + label + live timer */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Theme of the Year &middot; {new Date().getFullYear()}
                </span>
              </div>
              {/* Running timer */}
              <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-xl px-2.5 py-1">
                <span className="text-[9px] font-black text-white/70 tabular-nums tracking-wide">
                  {elapsed.days}d {String(elapsed.hours).padStart(2, '0')}h {String(elapsed.minutes).padStart(2, '0')}m
                </span>
              </div>
            </div>

            <p className="text-white font-black text-xl leading-tight uppercase tracking-wide">
              {yearTheme}
            </p>
            {yearScripture && (
              <p className="text-white/70 text-xs italic mt-1.5">{yearScripture}</p>
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

