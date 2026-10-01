import { pushNotificationService } from '@/lib/push-notifications'
import { createServiceClient } from '@/lib/supabase/service'
import { days, getPartnerPrayerState } from '@/lib/prayer/partnerPrayerState'
import { NextResponse } from 'next/server'

const PRAYER_URL = '/protected/posts?tab=prayer'

// Evening nudge for partners who haven't prayed yet today:
// - partner already prayed → "join them / keep your together streak"
// - neither prayed but a together streak is running → "it ends tonight"
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    // Runs in the evening UTC, which is still the same day for UTC+0/+1 users
    const today = new Date().toISOString().slice(0, 10)

    const { data: profiles, error } = await service
      .from('profiles')
      .select('id')
      .not('partner_id', 'is', null)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    let sent = 0
    for (const profile of profiles ?? []) {
      const state = await getPartnerPrayerState(service, profile.id, today)
      if (!state || state.iPrayedToday) continue

      let payload: { title: string; body: string } | null = null

      if (state.partnerPrayedToday) {
        payload = {
          title: `🙏 ${state.partnerName} prayed today`,
          body:
            state.togetherStreakBeforeToday > 0
              ? `Pray before midnight to keep your ${days(state.togetherStreakBeforeToday)} together streak 🔥`
              : 'Join them in prayer tonight and start a together streak.',
        }
      } else if (state.togetherStreakBeforeToday > 0) {
        payload = {
          title: '🔥 Your together streak ends tonight',
          body: `You and ${state.partnerName} have prayed together ${days(state.togetherStreakBeforeToday)} in a row. Pray tonight to keep it alive.`,
        }
      }

      if (!payload) continue

      await pushNotificationService.sendToUser(
        profile.id,
        { ...payload, url: PRAYER_URL, data: { type: 'partner_prayer_nudge' } },
        'meditation'
      )
      sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
