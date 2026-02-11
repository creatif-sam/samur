import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:dev@gen116.com',
    PUBLIC_KEY,
    PRIVATE_KEY
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { targetUserId, title, body, url } = await request.json()

  // Check if VAPID is configured
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 })
  }

  // 1. Verify the sender is logged in
  const { data: { user: sender } } = await supabase.auth.getUser()
  if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get the Target User's subscription from DB
  const { data: subData } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (!subData) {
    return NextResponse.json({ error: 'Partner is not subscribed on any device.' }, { status: 404 })
  }

  // 3. Send the Actual Push
  try {
    const payload = JSON.stringify({
      title: title || `Message from ${sender.email}`,
      body: body || 'New update in SamUr',
      url: url || '/'
    })

    await webpush.sendNotification(subData.subscription, payload)

    // 4. Log in Notifications Table so it shows in their Topbar Dropdown
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'message',
      title: title,
      body: body,
      read: false
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to deliver' }, { status: 500 })
  }
}