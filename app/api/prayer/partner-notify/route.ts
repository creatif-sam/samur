import { pushNotificationService } from '@/lib/push-notifications'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { days, getPartnerPrayerState } from '@/lib/prayer/partnerPrayerState'
import { NextResponse } from 'next/server'

const PRAYER_URL = '/protected/posts?tab=prayer'

// Called after the user completes a prayer session. Tells their partner, but
// only for the first completed session of the day so it never turns into spam.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // The client sends its local date, which is how sessions are stored
    const body = await request.json().catch(() => ({}))
    const today =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : new Date().toISOString().slice(0, 10)

    const service = createServiceClient()

    const { count } = await service
      .from('prayer_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)
      .eq('date', today)
    if (count !== 1) {
      return NextResponse.json({ sent: false, reason: 'not first prayer today' })
    }

    const state = await getPartnerPrayerState(service, user.id, today)
    if (!state) {
      return NextResponse.json({ sent: false, reason: 'no partner' })
    }

    const payload = state.partnerPrayedToday
      ? {
          title: '🙏 You both prayed today',
          body: `${state.meName} just prayed too. Your together streak is ${days(state.togetherStreak)} 🔥`,
        }
      : {
          title: `🙏 ${state.meName} just prayed`,
          body:
            state.togetherStreakBeforeToday > 0
              ? `Pray today to keep your ${days(state.togetherStreakBeforeToday)} together streak going 🔥`
              : 'Join them in prayer today and start a together streak.',
        }

    await pushNotificationService.sendToUser(
      state.partnerId,
      {
        ...payload,
        url: PRAYER_URL,
        data: { type: 'partner_prayer', togetherStreak: state.togetherStreak },
      },
      'meditation'
    )

    return NextResponse.json({ sent: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 })
  }
}
