'use client'

import { useEffect, useState } from 'react'
import { getPartnerMeditations } from '@/lib/meditations/getPartnerMeditations'
import { reduceMeditations, calculateStreak } from '@/lib/meditations/reducer'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Users } from 'lucide-react'

export default function PartnerMeditationBoard() {
  const [data, setData] = useState<any>(null)

  async function load() {
    const res = await getPartnerMeditations()
    if (!res) return

    const reduced = reduceMeditations(res.meditations)
    const todayKey = new Date().toISOString().slice(0, 10)

    const meDays = reduced[res.meId] ?? {}
    const partnerDays = res.partnerId
      ? reduced[res.partnerId] ?? {}
      : {}

    setData({
      me: {
        name: res.meName ?? 'You',
        avatar: res.meAvatar,
        streak: calculateStreak(meDays),
        today: meDays[todayKey],
      },
      partner: res.partnerId
        ? {
            name: res.partnerName ?? 'Partner',
            avatar: res.partnerAvatar,
            streak: calculateStreak(partnerDays),
            today: partnerDays[todayKey],
          }
        : null,
    })
  }

  useEffect(() => {
    load()
  }, [])

  if (!data || !data.partner) return null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Partnership Streaks</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PersonCard data={data.me} isMe />
        <PersonCard data={data.partner} isMe={false} />
      </div>
    </div>
  )
}

function PersonCard({ data, isMe }: { data: any; isMe: boolean }) {
  const doneToday = data?.today
  const streak = data.streak

  return (
    <div className="rounded-xl border bg-background/50 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Avatar name={data.name} avatar={data.avatar} />
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{data.name}</h3>
          {isMe && <span className="text-[10px] text-muted-foreground uppercase font-bold">You</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {streak >= 3 ? (
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-lg"
          >
            🔥
          </motion.span>
        ) : (
          <span className="text-lg">{streak > 0 ? '🔥' : '💤'}</span>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-bold">{streak} days</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Current Streak</span>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div
          className={`flex-1 h-2 rounded-full transition-colors ${
            doneToday?.morning ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-muted'
          }`}
          title="Morning"
        />
        <div
          className={`flex-1 h-2 rounded-full transition-colors ${
            doneToday?.evening ? 'bg-violet-500 shadow-sm shadow-violet-500/50' : 'bg-muted'
          }`}
          title="Evening"
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
        <span>🌅 Morning</span>
        <span>🌙 Evening</span>
      </div>
    </div>
  )
}

function Avatar({
  name,
  avatar,
}: {
  name: string
  avatar?: string | null
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={40}
        height={40}
        className="rounded-full object-cover ring-2 ring-border"
      />
    )
  }

  return (
    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white ring-2 ring-border">
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}
