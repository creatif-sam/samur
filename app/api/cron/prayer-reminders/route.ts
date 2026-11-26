import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { zonedDayRange, zonedNow } from '@/lib/dates'
import { notify } from '@/lib/push-notifications'
import { translate, type Language } from '@/lib/i18n'
import { cleanTimes, dueTime } from '@/lib/prayer/requests'

// Daily prayer reminders at the times each person chose (their own time zone).
// Called every minute by Supabase pg_cron (20261129010000_prayer_reminders_cron.sql).
// A run can be a few minutes late, so a time stays due for 5 minutes; each time is
// sent once a day.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const { data: rows, error } = await service.from('prayer_reminders').select('user_id, times')
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    let sent = 0
    for (const row of rows ?? []) {
      const times = cleanTimes(row.times)
      if (!times.length) continue
      const { data: userRes } = await service.auth.admin.getUserById(row.user_id)
      const user = userRes?.user
      if (!user) continue
      const timeZone = user.user_metadata?.timezone as string | undefined
      const { dateKey: today, minutes } = zonedNow(timeZone)
      const due = dueTime(times, minutes)
      if (!due) continue

      // Once per time per day, even when runs overlap
      const tag = `prayer-reminder-${today}-${due}`
      const { data: already, error: checkError } = await service.from('notifications').select('id')
        .eq('user_id', row.user_id).eq('type', 'prayer_reminder')
        .gte('created_at', zonedDayRange(timeZone, today).start)
        .eq('data->>tag', tag)
        .limit(1)
      // If we can't tell whether it went out, don't risk sending it again every minute
      if (checkError || (already && already.length > 0)) continue

      const lang: Language = user.user_metadata?.language === 'fr' ? 'fr' : 'en'
      await notify({
        userId: row.user_id,
        type: 'prayer_reminder',
        title: translate(lang, 'Time to pray 🙏'),
        body: translate(lang, 'Your {time} prayer time. Take a few minutes with God.', { time: due }),
        url: '/protected/posts?tab=prayer',
        tag,
        data: { tag },
      })
      sent++
    }
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Prayer reminders cron error:', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
