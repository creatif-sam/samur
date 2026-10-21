import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { addDays, zonedDayRange, zonedNow } from '@/lib/dates'
import { HABITS, currentStreak, type HabitKey } from '@/lib/habits'
import { notify } from '@/lib/push-notifications'

// Evening "don't break the chain" nudge. Called hourly; each user gets it once,
// in their local 7pm hour, listing habits with a running streak not done today.
const EVENING_START = 19 * 60
const EVENING_END = 20 * 60
const HISTORY_DAYS = 45

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const { data: { users }, error } = await service.auth.admin.listUsers()
    if (error || !users) return NextResponse.json({ ok: false, error: 'Failed to fetch users' })

    let sent = 0
    for (const user of users) {
      const timeZone = user.user_metadata?.timezone as string | undefined
      const { dateKey: today, minutes } = zonedNow(timeZone)
      if (minutes < EVENING_START || minutes >= EVENING_END) continue

      // Once a day, even if the job runs twice in that hour
      const { data: already } = await service
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'habit_nudge')
        .gte('created_at', zonedDayRange(timeZone, today).start)
        .limit(1)
      if (already && already.length > 0) continue

      const since = addDays(today, -HISTORY_DAYS)
      const sinceIso = zonedDayRange(timeZone, since).start
      const localKey = (ts: string) => zonedNow(timeZone, new Date(ts)).dateKey

      const [prayer, meditations, reading, bible, verses] = await Promise.all([
        service.from('prayer_sessions').select('date').eq('user_id', user.id).eq('completed', true).gte('date', since),
        service.from('meditations').select('created_at').eq('author_id', user.id).gte('created_at', sinceIso),
        service.from('reading_logs').select('reading_date').eq('user_id', user.id).gte('reading_date', since),
        service.from('bible_progress').select('read_at').eq('user_id', user.id).gte('read_at', sinceIso),
        service.from('memory_verses').select('day').eq('user_id', user.id).gte('day', since),
      ])

      const days: Record<HabitKey, Set<string>> = {
        prayer: new Set((prayer.data ?? []).map((r: { date: string }) => r.date)),
        meditation: new Set((meditations.data ?? []).map((r: { created_at: string }) => localKey(r.created_at))),
        reading: new Set((reading.data ?? []).map((r: { reading_date: string }) => r.reading_date)),
        bible: new Set((bible.data ?? []).map((r: { read_at: string }) => localKey(r.read_at))),
        verse: new Set((verses.data ?? []).map((r: { day: string }) => r.day)),
      }

      const atRisk = HABITS
        .filter(h => !days[h.key].has(today))
        .map(h => ({ ...h, streak: currentStreak(days[h.key], today) }))
        .filter(h => h.streak > 0)
        .sort((a, b) => b.streak - a.streak)
      if (atRisk.length === 0) continue

      const top = atRisk[0]
      const others = atRisk.slice(1).map(h => h.label.toLowerCase())
      await notify({
        userId: user.id,
        type: 'habit_nudge',
        title: `🔥 Keep your ${top.streak}-day ${top.label.toLowerCase()} streak`,
        body: others.length
          ? `Still to do today: ${top.label.toLowerCase()}, ${others.join(', ')}.`
          : `There's still time today. ${top.emoji}`,
        url: top.href,
        tag: `habit-nudge-${today}`,
      })
      sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
