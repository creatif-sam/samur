import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch notifications for the user
    const { data: notifications, error: dbError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dbError) {
      console.error('Error fetching notifications:', dbError)
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [] })

  } catch (err: any) {
    console.error('Error in notifications route:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user: sender }, error: authError } = await supabase.auth.getUser()
    if (authError || !sender) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bodyData = await request.json()
    const { targetUserId, type, title, body, url, data } = bodyData

    // 1. Create in-app notification
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: type || 'general',
        title: title,
        body: body,
        data: data || {},
        read: false
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating notification:', dbError)
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 })
    }

    // 2. Send push notification (best effort - don't fail if this fails)
    try {
      const origin = new URL(request.url).origin
      await fetch(`${origin}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, title, body, url })
      })
    } catch (pushErr) {
      console.warn('Push notification failed (non-critical):', pushErr)
    }

    return NextResponse.json({ success: true, notification })

  } catch (err: any) {
    console.error('Error in notifications POST route:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
