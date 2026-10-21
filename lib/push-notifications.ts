import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import webPush from 'web-push'
import { zonedNow } from '@/lib/dates'
import { categoryForType, inQuietHours, notificationUrl } from '@/lib/notifications/categories'

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, unknown>
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  url?: string
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotifyInput {
  userId: string
  type: string
  title: string
  body: string
  url?: string
  data?: Record<string, unknown>
  // Same tag replaces the previous push on the device (e.g. one per task); defaults to unique
  tag?: string
}

export interface NotifyResult {
  notificationId?: string
  pushed: number
  skipped?: 'disabled' | 'quiet_hours' | 'no_devices'
}

type Subscription = {
  id?: string
  endpoint: string
  keys?: { p256dh?: string; auth?: string } | null
  subscription?: unknown
}

/* ---------------------------
   Lazy VAPID initialization
---------------------------- */

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured')
  }

  webPush.setVapidDetails('mailto:dev@gen116.com', publicKey, privateKey)
  vapidConfigured = true
}

/* ---------------------------
   Delivery
---------------------------- */

// Older rows keep the subscription JSON in `subscription` (sometimes as a string)
function webPushTarget(sub: Subscription) {
  let stored = sub.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | string | null | undefined
  if (typeof stored === 'string') {
    try { stored = JSON.parse(stored) } catch { stored = null }
  }
  const parsed = (stored && typeof stored === 'object' ? stored : {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  return {
    endpoint: parsed.endpoint || sub.endpoint,
    keys: {
      p256dh: parsed.keys?.p256dh || sub.keys?.p256dh || '',
      auth: parsed.keys?.auth || sub.keys?.auth || '',
    },
  }
}

/**
 * The one way to notify a user. Respects their category switches (a disabled
 * category is not stored or pushed), stores the in-app notification with its
 * link, skips the push during quiet hours, and pushes to every device.
 * Callers must have already checked they are allowed to notify this user.
 */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const supabase = createServiceClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', input.userId)
    .maybeSingle()

  const category = categoryForType(input.type)
  if (category && prefs && prefs[category.key] === false) return { pushed: 0, skipped: 'disabled' }

  const url = input.url || notificationUrl({ type: input.type, data: input.data as { url?: string } })

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: { ...(input.data ?? {}), url },
      read: false,
    })
    .select('id')
    .single()
  if (error || !notification) {
    console.error('Failed to store notification', error)
    return { pushed: 0 }
  }

  // Quiet hours are in the user's local time (synced to their auth metadata)
  if (prefs?.quiet_start && prefs?.quiet_end) {
    const { data: userRes } = await supabase.auth.admin.getUserById(input.userId)
    const { minutes } = zonedNow(userRes?.user?.user_metadata?.timezone as string | undefined)
    if (inQuietHours(prefs, minutes, input.type)) {
      return { notificationId: notification.id, pushed: 0, skipped: 'quiet_hours' }
    }
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', input.userId)
  if (!subscriptions || subscriptions.length === 0) {
    return { notificationId: notification.id, pushed: 0, skipped: 'no_devices' }
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .eq('read', false)

  const message = {
    title: input.title,
    body: input.body,
    url,
    tag: input.tag || `${input.type}-${notification.id}`,
    badgeCount: unreadCount ?? 1,
    data: { ...(input.data ?? {}), url, notificationId: notification.id },
  }

  const results = await Promise.allSettled(
    (subscriptions as Subscription[]).map(sub =>
      sub.endpoint?.startsWith('expo:') ? sendExpoPush(sub, message) : sendWebPush(sub, message),
    ),
  )
  const pushed = results.filter(r => r.status === 'fulfilled').length
  if (pushed > 0) {
    await supabase.from('notifications').update({ sent_at: new Date().toISOString() }).eq('id', notification.id)
  }
  return { notificationId: notification.id, pushed }
}

type PushMessage = {
  title: string
  body: string
  url: string
  tag: string
  badgeCount: number
  data: Record<string, unknown>
}

async function removeSubscription(endpoint: string) {
  await createServiceClient().from('push_subscriptions').delete().eq('endpoint', endpoint)
}

async function sendWebPush(sub: Subscription, message: PushMessage) {
  ensureVapidConfigured()
  const target = webPushTarget(sub)
  try {
    await webPush.sendNotification(target, JSON.stringify(message))
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) await removeSubscription(sub.endpoint)
    throw err
  }
}

/**
 * Deliver to the Expo (React Native) app via the Expo Push API.
 * Subscriptions created by mastery_mobile store endpoint as `expo:<ExpoPushToken>`.
 */
async function sendExpoPush(sub: Subscription, message: PushMessage) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: sub.endpoint.slice('expo:'.length),
      title: message.title,
      body: message.body,
      sound: 'default',
      badge: message.badgeCount,
      data: message.data,
    }),
  })

  const result = await res.json().catch(() => null)
  const ticket = result?.data
  // Clean up dead device tokens the same way 404/410 web-push endpoints are removed
  if (ticket?.status === 'error') {
    if (ticket.details?.error === 'DeviceNotRegistered') await removeSubscription(sub.endpoint)
    throw new Error(ticket.message || 'Expo push failed')
  }
  if (!res.ok) throw new Error(`Expo push HTTP ${res.status}`)
}

/* ---------------------------
   Service (kept for existing callers)
---------------------------- */

export class PushNotificationService {
  async sendToUser(userId: string, payload: PushNotificationPayload, type = 'system') {
    try {
      await notify({
        userId,
        type: (payload.data?.type as string | undefined) === 'budget_threshold' ? 'budget_alert' : type,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        data: payload.data,
        tag: payload.tag,
      })
    } catch (err) {
      console.error('Push notification error', err)
    }
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload, type = 'system') {
    await Promise.all(userIds.map(id => this.sendToUser(id, payload, type)))
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data
  }

  async markAsRead(notificationId: string, userId: string) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async markAllAsRead(userId: string) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
  }
}

export const pushNotificationService = new PushNotificationService()
