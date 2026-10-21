import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notify } from '@/lib/push-notifications'
import { canNotify, clientNotificationType } from '@/lib/notifications/permissions'

// Notify yourself (e.g. the test push), your partner, or a pending invitee.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: sender }, error: authError } = await supabase.auth.getUser()
    if (authError || !sender) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, type, title, body, url, data } = await request.json()
    if (typeof targetUserId !== 'string' || !targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }
    if (!(await canNotify(sender.id, targetUserId))) {
      return NextResponse.json({ error: 'You can only notify your partner' }, { status: 403 })
    }

    // 'system' bypasses preferences, so it's only allowed for notifying yourself
    let resolvedType = clientNotificationType(type)
    if (resolvedType === 'system' && targetUserId !== sender.id) resolvedType = 'message'

    const result = await notify({
      userId: targetUserId,
      type: resolvedType,
      title: title || 'SamUr',
      body: body || 'New update in SamUr',
      url,
      data: data && typeof data === 'object' ? data : undefined,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Notification send error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
