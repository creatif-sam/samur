import type { SupabaseClient } from '@supabase/supabase-js'
import { intersect, shiftISO, streakEndingOn, streakFrom } from '@/lib/prayer/streak'

export type PartnerPrayerState = {
  meName: string
  partnerId: string
  partnerName: string
  iPrayedToday: boolean
  partnerPrayedToday: boolean
  // Together streak counted up to yesterday: what's at stake today
  togetherStreakBeforeToday: number
  // Together streak including today (equals the above + 1 once both prayed)
  togetherStreak: number
}

// Needs a service-role client: it reads the partner's sessions and profile.
export async function getPartnerPrayerState(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<PartnerPrayerState | null> {
  const { data: me } = await supabase
    .from('profiles')
    .select('id, name, partner_id')
    .eq('id', userId)
    .maybeSingle()
  if (!me?.partner_id) return null

  const { data: partner } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', me.partner_id)
    .maybeSingle()
  if (!partner) return null

  const loadDays = async (id: string) => {
    const { data } = await supabase
      .from('prayer_sessions')
      .select('date')
      .eq('user_id', id)
      .eq('completed', true)
      .gte('date', shiftISO(today, -365))
      .lte('date', today)
    return new Set((data ?? []).map(s => s.date as string))
  }

  const [myDays, partnerDays] = await Promise.all([loadDays(me.id), loadDays(partner.id)])
  const bothDays = intersect(myDays, partnerDays)

  return {
    meName: me.name ?? 'Your partner',
    partnerId: partner.id,
    partnerName: partner.name ?? 'Your partner',
    iPrayedToday: myDays.has(today),
    partnerPrayedToday: partnerDays.has(today),
    togetherStreakBeforeToday: streakEndingOn(bothDays, shiftISO(today, -1)),
    togetherStreak: streakFrom(bothDays, today),
  }
}

export const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`
