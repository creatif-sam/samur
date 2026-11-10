'use client'

import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CLOCK_NOTICE_KEY, clockIsOff, describeSkew, measureSkew } from '@/lib/clockCheck'

// Keeps the user's IANA time zone in their auth metadata so server-side
// reminders (task reminders, morning planner) run on their local clock.
// First it checks this device's clock against the server: a phone with a wrong
// time zone (and a hand-set clock) must not overwrite the zone the other devices
// sent, and gets a notice explaining how to fix it.
export default function TimezoneSync() {
  const [skewMs, setSkewMs] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let skew: number | null = null
      try {
        const sentAt = Date.now()
        const res = await fetch(`/api/version?clock=${sentAt}`, { cache: 'no-store' })
        const receivedAt = Date.now()
        const body = await res.json()
        if (typeof body?.now === 'number') skew = measureSkew(sentAt, receivedAt, body.now)
      } catch {}
      if (cancelled) return

      if (skew !== null && clockIsOff(skew)) {
        let hiddenUntil = 0
        try { hiddenUntil = Number(localStorage.getItem(CLOCK_NOTICE_KEY)) || 0 } catch {}
        if (Date.now() > hiddenUntil) setSkewMs(skew)
        return // don't send this device's time zone to the server
      }
      // Offline (no check possible) still syncs, as before
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!timeZone) return
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user && data.user.user_metadata?.timezone !== timeZone) {
        await supabase.auth.updateUser({ data: { timezone: timeZone } })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (skewMs === null) return null

  const hide = () => {
    try { localStorage.setItem(CLOCK_NOTICE_KEY, String(Date.now() + 24 * 3_600_000)) } catch {}
    setSkewMs(null)
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-3 z-[95] mx-auto max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950 shadow-xl dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">This phone&apos;s clock is {describeSkew(skewMs)}</p>
          <p className="mt-1 leading-snug text-amber-900/80 dark:text-amber-100/80">
            Times, morning or evening, and streaks will be wrong here. Open your phone&apos;s Settings, then Date &amp; time, and turn on both automatic time and automatic time zone.
          </p>
        </div>
        <button onClick={hide} aria-label="Hide for today" className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-amber-200/60 dark:hover:bg-amber-800/60">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
