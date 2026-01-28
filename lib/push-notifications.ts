import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import webPush from 'web-push'

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
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

/* VAPID must be configured ONCE */
webPush.setVapidDetails(
  'mailto:dev@gen116.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export class PushNotificationService {
  private async getSupabase() {
    return createClient()
  }

  private async getServiceSupabase() {
    return createServiceClient()
  }

  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    type: 'message' | 'planner_reminder' | 'goal_deadline' | 'goal_progress' | 'post' | 'system' = 'system'
  ) {
    try {
      const supabase = await this.getSupabase()

      /* 1. Preference check */
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      const prefKey = this.getPreferenceKey(type)
      if (preferences && preferences[prefKey] === false) return

      /* 2. Get subscriptions */
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

      if (!subscriptions || subscriptions.length === 0) return

      /* 3. Persist notification */
      const serviceSupabase = await this.getServiceSupabase()
      const { data: notification } = await serviceSupabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title: payload.title,
          body: payload.body,
          data: payload.data || {}
        })
        .select()
        .single()

      if (!notification) return

      /* 4. Send push */
      const results = await Promise.allSettled(
        subscriptions.map(sub =>
          this.sendWebPush(sub, payload, notification.id)
        )
      )

      const success = results.some(r => r.status === 'fulfilled')
      if (success) {
        await supabase
          .from('notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', notification.id)
      }

    } catch (err) {
      console.error('Push notification error', err)
    }
  }

  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    type: 'system'
  ) {
    await Promise.all(
      userIds.map(id => this.sendToUser(id, payload, type))
    )
  }

  private async sendWebPush(subscription: any, payload: PushNotificationPayload, notificationId: string) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      image: payload.image,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      tag: payload.tag,
      data: {
        ...payload.data,
        notificationId,
        url: payload.url
      }
    })

    try {
      await webPush.sendNotification(pushSubscription, body)
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        const serviceSupabase = await this.getServiceSupabase()
        await serviceSupabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
      }
      throw err
    }
  }


    async getUserNotifications(
    userId: string,
    limit = 50,
    offset = 0
  ) {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return data
  }


    async markAsRead(notificationId: string, userId: string) {
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }

  async markAllAsRead(userId: string) {
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      throw error
    }
  }


  private getPreferenceKey(type: string) {
    switch (type) {
      case 'message': return 'messages'
      case 'planner_reminder': return 'planner_reminders'
      case 'goal_deadline': return 'goal_deadlines'
      case 'goal_progress': return 'goal_progress'
      case 'post': return 'posts'
      default: return 'messages'
    }
  }
}

export const pushNotificationService = new PushNotificationService()
