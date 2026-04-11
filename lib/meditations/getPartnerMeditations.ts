// lib/meditations/getPartnerMeditations.ts
import { createClient } from '@/lib/supabase/client'

export async function getPartnerMeditations() {
  const supabase = createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: me } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, partner_id')
    .eq('id', auth.user.id)
    .single()

  if (!me) return null

  const userIds = me.partner_id
    ? [me.id, me.partner_id]
    : [me.id]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds)

  const partner = profiles?.find(
    (p) => p.id === me.partner_id,
  )

  const { data: meditations } = await supabase
    .from('meditations')
    .select('author_id, created_at, period, visibility')
    .in('author_id', userIds)
    // Fetch all meditations (shared and private) to calculate accurate streaks

  return {
    meId: me.id,
    meName: me.name,
    meAvatar: me.avatar_url,

    partnerId: partner?.id ?? null,
    partnerName: partner?.name ?? null,
    partnerAvatar: partner?.avatar_url ?? null,

    meditations: meditations ?? [],
  }
}
