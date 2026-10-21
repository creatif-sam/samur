import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { notify } from '@/lib/push-notifications'
import { canNotify, clientNotificationType } from '@/lib/notifications/permissions'

// List your notifications (newest first) with the true unread count
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

    const [{ data: notifications, error: dbError }, { count: unreadCount }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ])

    if (dbError) {
      console.error('Error fetching notifications:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // One extra row was fetched to know whether there's another page
    const rows = notifications ?? []
    return NextResponse.json({
      notifications: rows.slice(0, limit),
      hasMore: rows.length > limit,
      unreadCount: unreadCount ?? 0,
    })
  } catch (err) {
    console.error('Error in notifications route:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Notify your partner (or a pending invitee) from the client
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: sender }, error: authError } = await supabase.auth.getUser()
    if (authError || !sender) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, type, title, body, url, data } = await request.json()
    if (typeof targetUserId !== 'string' || !(await canNotify(sender.id, targetUserId)) || targetUserId === sender.id) {
      return NextResponse.json({ error: 'You can only notify your partner' }, { status: 403 })
    }

    const result = await notify({
      userId: targetUserId,
      type: clientNotificationType(type),
      title: title || 'SamUr',
      body: body || '',
      url,
      data: data && typeof data === 'object' ? data : undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Error in notifications POST route:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Delete one of your notifications ({ id }) or all read ones ({ allRead: true })
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, allRead } = await request.json().catch(() => ({}))
    // Scoped to the signed-in user; service client so RLS delete policies aren't required
    let query = createServiceClient().from('notifications').delete().eq('user_id', user.id)
    if (typeof id === 'string') query = query.eq('id', id)
    else if (allRead === true) query = query.eq('read', true)
    else return NextResponse.json({ error: 'Nothing to delete' }, { status: 400 })

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting notifications:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
