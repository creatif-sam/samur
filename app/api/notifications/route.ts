import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

// 1. Initialize Web Push with your VAPID keys from .env.local
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:dev@gen116.com',
    PUBLIC_KEY,
    PRIVATE_KEY
  )
}

// --- GET: Fetch notifications for the current user's Topbar ---
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // Get current session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data })
}

// --- POST: Send a push notification and log it in the database ---
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { targetUserId, title, body, url } = await request.json()

    // 1. Verify the sender is logged in
    const { data: { user: sender } } = await supabase.auth.getUser()
    if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Get the target user's browser push subscriptions
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId)

    if (subError) throw new Error(`Subscription lookup failed: ${subError.message}`)

    // 3. Prepare the notification payload
    const payload = JSON.stringify({
      title: title || "SamUr🤍 Notification",
      body: body || "New update from your partner",
      url: url || "/protected"
    })

    // 4. Dispatch Push Notifications (to all registered devices)
    // FIX: Explicitly typed as any[] to satisfy TypeScript build requirements
    let pushResults: any[] = [] 
    if (subs && subs.length > 0) {
      pushResults = await Promise.allSettled(
        subs.map(sub => webpush.sendNotification(sub.subscription, payload))
      )
    }

    // 5. CRITICAL: Insert into the notifications table for UI display
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'message',
        title: title || "New Message",
        body: body || "You have a new update in SamUr",
        url: url || "/protected",
        read: false
      })

    if (dbError) {
      console.error("❌ Database Insert Error:", dbError.message)
      return NextResponse.json({ 
        error: "Push may have sent, but DB log failed", 
        details: dbError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      devicesReached: pushResults.filter(r => r.status === 'fulfilled').length 
    })

  } catch (err: any) {
    console.error("❌ API Route Crash:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}