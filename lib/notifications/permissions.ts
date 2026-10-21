import { createServiceClient } from '@/lib/supabase/service'

// A signed-in user may notify themselves, their partner, or someone they have a
// pending partner invite with (either direction).
export async function canNotify(senderId: string, targetUserId: string) {
  if (!targetUserId) return false
  if (targetUserId === senderId) return true

  const service = createServiceClient()
  const [{ data: profile }, { data: invites }] = await Promise.all([
    service.from('profiles').select('partner_id').eq('id', senderId).maybeSingle(),
    service
      .from('partner_requests')
      .select('id')
      .eq('status', 'pending')
      .or(`and(from_user_id.eq.${senderId},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${senderId})`)
      .limit(1),
  ])
  return profile?.partner_id === targetUserId || (invites?.length ?? 0) > 0
}

// Types a client may send through the user-facing routes (system/cron types are server-only)
const CLIENT_TYPES = new Set([
  'message', 'partner_invite', 'post', 'comment', 'mention', 'like',
  'goal_progress', 'goal_created', 'meditation', 'system',
])

export function clientNotificationType(type: unknown, fallback = 'message') {
  return typeof type === 'string' && CLIENT_TYPES.has(type) ? type : fallback
}
