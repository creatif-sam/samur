'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/meditations/PartnerMeditationBoard'
import { intersect, streakFrom, toISO } from '@/lib/prayer/streak'

type Person = {
  name: string
  avatar: string | null
  streak: number
  minutesToday: number
}

type BoardData = {
  me: Person
  partner: Person
  togetherStreak: number
}

export default function PartnerPrayerBoard({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<BoardData | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data: me } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, partner_id')
        .eq('id', auth.user.id)
        .single()
      if (!me?.partner_id) return

      const since = new Date()
      since.setDate(since.getDate() - 365)

      const [{ data: partner }, { data: sessions }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', me.partner_id)
          .maybeSingle(),
        supabase
          .from('prayer_sessions')
          .select('user_id, date, duration_seconds')
          .in('user_id', [me.id, me.partner_id])
          .eq('completed', true)
          .gte('date', toISO(since)),
      ])
      if (!partner) return

      const today = toISO(new Date())
      const daysByUser = new Map<string, Set<string>>([
        [me.id, new Set()],
        [partner.id, new Set()],
      ])
      const minutesToday = new Map<string, number>()

      sessions?.forEach(s => {
        daysByUser.get(s.user_id)?.add(s.date)
        if (s.date === today) {
          minutesToday.set(
            s.user_id,
            (minutesToday.get(s.user_id) ?? 0) + Math.round((s.duration_seconds ?? 0) / 60)
          )
        }
      })

      const myDays = daysByUser.get(me.id)!
      const partnerDays = daysByUser.get(partner.id)!
      const bothDays = intersect(myDays, partnerDays)

      setData({
        me: {
          name: me.name ?? 'You',
          avatar: me.avatar_url,
          streak: streakFrom(myDays),
          minutesToday: minutesToday.get(me.id) ?? 0,
        },
        partner: {
          name: partner.name ?? 'Partner',
          avatar: partner.avatar_url,
          streak: streakFrom(partnerDays),
          minutesToday: minutesToday.get(partner.id) ?? 0,
        },
        togetherStreak: streakFrom(bothDays),
      })
    }
    void load()
  }, [refreshKey])

  if (!data) return null

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Partnership Prayer Streaks</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PersonCard person={data.me} isMe />
        <PersonCard person={data.partner} isMe={false} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-600/10 to-amber-500/10 px-3 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">🙏 Prayed together</span>
        <span className="text-sm font-bold">
          {data.togetherStreak} {data.togetherStreak === 1 ? 'day' : 'days'} in a row
        </span>
      </div>
    </div>
  )
}

function PersonCard({ person, isMe }: { person: Person; isMe: boolean }) {
  const prayedToday = person.minutesToday > 0

  return (
    <div className="rounded-xl border bg-background/50 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Avatar name={person.name} avatar={person.avatar} />
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{person.name}</h3>
          {isMe && <span className="text-[10px] text-muted-foreground uppercase font-bold">You</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {person.streak >= 3 ? (
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="text-lg"
          >
            🔥
          </motion.span>
        ) : (
          <span className="text-lg">{person.streak > 0 ? '🔥' : '💤'}</span>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-bold">{person.streak} days</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Current Streak</span>
        </div>
      </div>

      <div
        className={`h-2 rounded-full transition-colors ${
          prayedToday ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-muted'
        }`}
      />
      <p className="text-[10px] text-muted-foreground font-medium">
        {prayedToday ? `Prayed today · ${person.minutesToday} min` : 'Not yet today'}
      </p>
    </div>
  )
}
