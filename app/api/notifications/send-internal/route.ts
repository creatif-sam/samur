import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

/**
 * Internal notification sender for system/cron jobs
 * Requires CRON_SECRET for authentication instead of user session
 */
export async function POST(request: Request) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("❌ CRON_SECRET not configured")
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("❌ Invalid CRON_SECRET")
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      console.error("❌ VAPID Keys missing")
      return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
    }

    // Configure web-push
    webpush.setVapidDetails('mailto:dev@gen116.com', PUBLIC_KEY, PRIVATE_KEY)

    const serviceSupabase = createServiceClient()
    const bodyData = await request.json()
    const { targetUserId, type, title, body, url, data } = bodyData

    // 2. Create in-app notification
    const { error: dbError } = await serviceSupabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: type || 'general',
        title: title,
        body: body,
        data: data || {},
        read: false
      })

    if (dbError) {
      console.error("❌ Database Error:", dbError)
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 })
    }

    // 3. Get ALL subscriptions for the target user
    const { data: subscriptions, error: subError } = await serviceSupabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)

    if (subError) {
      console.error("❌ Subscription fetch error:", subError)
      return NextResponse.json({ error: 'Database error', details: subError.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`ℹ️ No subscriptions for user: ${targetUserId}`)
      return NextResponse.json({ success: true, pushed: 0, reason: 'No subscriptions' })
    }

    console.log(`📤 Sending push to ${subscriptions.length} device(s)`)

    // 4. PREPARE THE PAYLOAD
    const payload = JSON.stringify({
      title: title || 'Espirito Notification',
      body: body || '',
      url: url || '/protected'
    })

    // 5. SEND NOTIFICATION TO ALL DEVICES
    const sendResults = await Promise.allSettled(
      subscriptions.map(async (subData) => {
        try {
          let subscriptionData = subData.subscription
          if (typeof subscriptionData === 'string') {
            subscriptionData = JSON.parse(subscriptionData)
          }

          const pushSubscription = {
            endpoint: subscriptionData.endpoint || subData.endpoint,
            keys: subscriptionData.keys || {
              p256dh: subData.keys?.p256dh,
              auth: subData.keys?.auth
            }
          }

          await webpush.sendNotification(pushSubscription, payload)
          console.log("✅ Sent to:", pushSubscription.endpoint?.substring(0, 50) + "...")
          return { success: true }
        } catch (pushErr: any) {
          console.error("❌ Push failed:", pushErr.statusCode, pushErr.body)
          
          // If subscription is invalid, delete it
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await serviceSupabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subData.id)
            console.log("🗑️ Removed invalid subscription")
          }
          
          throw pushErr
        }
      })
    )

    const successCount = sendResults.filter(r => r.status === 'fulfilled').length
    const failCount = sendResults.filter(r => r.status === 'rejected').length

    console.log(`✅ Push sent to ${successCount}/${subscriptions.length} device(s)`)

    return NextResponse.json({ 
      success: true,
      pushed: successCount,
      failed: failCount,
      total: subscriptions.length
    })

  } catch (err: any) {
    console.error("❌ Internal notification error:", err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
