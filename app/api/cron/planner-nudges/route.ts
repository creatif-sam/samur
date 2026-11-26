import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { zonedDayRange, zonedNow } from '@/lib/dates'
import { notify } from '@/lib/push-notifications'
import { translate, type Language } from '@/lib/i18n'
import { parseDateKey } from '@/lib/dates'

// Sunday evening "plan your week" nudge. Called hourly (Supabase pg_cron, see
// 20261128010000_planner_nudges_cron.sql); each person gets it once, in their local
// 18:00 hour on a Sunday, when they have roles but no big rocks for the new week yet.
const START = 18 * 60
const END = 19 * 60

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (error || !users) return NextResponse.json({ ok: false, error: 'Failed to fetch users' }, { status: 500 })

    let sent = 0
    for (const user of users) {
      const timeZone = user.user_metadata?.timezone as string | undefined
      const { dateKey: today, minutes } = zonedNow(timeZone)
      if (parseDateKey(today).getDay() !== 0 || minutes < START || minutes >= END) continue

      // Weeks run Sunday to Saturday, so on Sunday the new week starts today
      const [{ count: roleCount }, { count: rockCount }, { data: already }] = await Promise.all([
        service.from('roles').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_archived', false),
        service.from('weekly_rocks').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('week_start', today),
        service.from('notifications').select('id').eq('user_id', user.id).eq('type', 'week_plan')
          .gte('created_at', zonedDayRange(timeZone, today).start).limit(1),
      ])
      if (!roleCount || rockCount || (already && already.length > 0)) continue

      const lang: Language = user.user_metadata?.language === 'fr' ? 'fr' : 'en'
      await notify({
        userId: user.id,
        type: 'week_plan',
        title: translate(lang, 'Plan your week 🗓️'),
        body: translate(lang, 'Choose one or two big rocks per role, then book time for them.'),
        url: '/protected/goals?tab=week',
        tag: `week-plan-${today}`,
      })
      sent++
    }
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Planner nudges cron error:', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
