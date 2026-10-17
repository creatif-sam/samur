'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Keeps the user's IANA time zone in their auth metadata so server-side
// reminders (task reminders, morning planner) run on their local clock.
export default function TimezoneSync() {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.user_metadata?.timezone !== timeZone) {
        supabase.auth.updateUser({ data: { timezone: timeZone } })
      }
    })
  }, [])

  return null
}
