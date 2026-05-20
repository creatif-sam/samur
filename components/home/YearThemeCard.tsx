'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crown } from 'lucide-react'

export default function YearThemeCard() {
  const [yearTheme, setYearTheme] = useState<string | null>(null)
  const [yearScripture, setYearScripture] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_preferences')
        .select('year_theme, year_scripture')
        .eq('user_id', user.id)
        .single()
      if (data?.year_theme)     setYearTheme(data.year_theme)
      if (data?.year_scripture) setYearScripture(data.year_scripture)
    }
    load()
  }, [])

  if (!yearTheme) return null

  return (
    <div className="mx-4 mt-4">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#A78BFA] p-5">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Theme of the Year &middot; {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-white font-black text-xl leading-tight uppercase tracking-wide">
            {yearTheme}
          </p>
          {yearScripture && (
            <p className="text-white/70 text-xs italic mt-1.5">{yearScripture}</p>
          )}
        </div>
      </div>
    </div>
  )
}
