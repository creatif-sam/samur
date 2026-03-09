import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST(request: Request) {
  try {
    const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

    // 1. Check configuration immediately
    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      console.error("VAPID Keys missing in environment");
      return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
    }

    // Configure web-push inside the request to ensure keys are loaded
    webpush.setVapidDetails('mailto:dev@gen116.com', PUBLIC_KEY, PRIVATE_KEY)

    const supabase = await createClient()
    const bodyData = await request.json()
    const { targetUserId, title, body, url } = bodyData

    // 2. Verify sender
    const { data: { user: sender }, error: authError } = await supabase.auth.getUser()
    if (authError || !sender) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Get ALL subscriptions for the target user (may have multiple devices)
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)

    if (dbError) {
      console.error("❌ Database Error:", dbError)
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.error("❌ No subscriptions found for user:", targetUserId)
      return NextResponse.json({ error: 'Recipient not subscribed' }, { status: 404 })
    }

    console.log(`📤 Sending push to ${subscriptions.length} device(s)`)

    // 4. PREPARE THE PAYLOAD
    const payload = JSON.stringify({
      title: title || `SamUr: Message from ${sender.email}`,
      body: body || 'New update in SamUr',
      url: url || '/protected/posts'
    })

    // 5. SEND NOTIFICATION TO ALL DEVICES
    const sendResults = await Promise.allSettled(
      subscriptions.map(async (subData) => {
        try {
          // Parse subscription data
          let subscriptionData = subData.subscription
          if (typeof subscriptionData === 'string') {
            subscriptionData = JSON.parse(subscriptionData)
          }

          // Ensure we have the proper structure for web-push
          const pushSubscription = {
            endpoint: subscriptionData.endpoint || subData.endpoint,
            keys: subscriptionData.keys || {
              p256dh: subData.keys?.p256dh,
              auth: subData.keys?.auth
            }
          }

          await webpush.sendNotification(pushSubscription, payload)
          console.log("✅ Sent to:", pushSubscription.endpoint?.substring(0, 50) + "...")
          return { success: true, endpoint: pushSubscription.endpoint }
        } catch (pushErr: any) {
          console.error("❌ Push failed:", pushErr.statusCode, pushErr.body)
          
          // If subscription is invalid (410 Gone or 404 Not Found), delete it
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subData.id)
            console.log("🗑️ Removed invalid subscription")
          }
          
          throw pushErr
        }
      })
    )

    // Check if at least one notification was sent successfully
    const successCount = sendResults.filter(r => r.status === 'fulfilled').length
    const failCount = sendResults.filter(r => r.status === 'rejected').length

    if (successCount === 0) {
      return NextResponse.json({ 
        error: 'All push notifications failed',
        details: `Failed to send to all ${subscriptions.length} device(s)`
      }, { status: 502 })
    }

    // 6. LOG IN DB (For in-app dropdown)
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'message',
      title: title || 'New Notification',
      body: body || '',
      read: false
    })

    console.log(`✅ Push sent to ${successCount}/${subscriptions.length} device(s)`)

    return NextResponse.json({ 
      success: true,
      sent: successCount,
      failed: failCount,
      total: subscriptions.length
    })

  } catch (err: any) {
    console.error("Global Route Error:", err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}