'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationPreferences {
  messages: boolean
  planner_reminders: boolean
  goal_deadlines: boolean
  goal_progress: boolean
  posts: boolean
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    messages: true,
    planner_reminders: true,
    goal_deadlines: true,
    goal_progress: true,
    posts: true
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const loadPreferences = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setPreferences({
        messages: data.messages,
        planner_reminders: data.planner_reminders,
        goal_deadlines: data.goal_deadlines,
        goal_progress: data.goal_progress,
        posts: data.posts
      })
    }
  }, [supabase])

  const init = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false)
      setLoading(false)
      return
    }
    setPermission(Notification.permission)
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      setIsSubscribed(!!existing)
      await loadPreferences()
    } catch (err) {
      console.error("Init error:", err)
    } finally {
      setLoading(false)
    }
  }, [loadPreferences])

  useEffect(() => { init() }, [init])

  const subscribe = async () => {
    setActionLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        toast.error('Permission denied. Please enable notifications in settings.')
        return
      }

      const audio = new Audio('/sounds/notification.mp3')
      await audio.play().catch(() => console.log("Audio context warmed up"))

      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID Key missing')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription: subscription.toJSON()
      })

      setIsSubscribed(true)
      toast.success('SamUr Connect: Notifications Active 🤍')
    } catch (error) {
      toast.error('Failed to link device.')
    } finally { setActionLoading(false) }
  }

  const unsubscribe = async () => {
    setActionLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      }
      setIsSubscribed(false)
      toast.success('Notifications Paused')
    } catch (error) { toast.error('Error disabling push.') } finally { setActionLoading(false) }
  }

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const updatedPrefs = { ...preferences, [key]: value }
    setPreferences(updatedPrefs)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      ...updatedPrefs
    })
    if (error) {
      toast.error('Sync failed')
      setPreferences(preferences)
    }
  }

  const sendTestNotification = async () => {
    setActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user.id,
          title: 'Test Notification',
          body: 'This is a test push notification from SamUr!',
          url: '/protected'
        })
      })

      if (response.ok) {
        toast.success('Test notification sent! Check your phone.')
      } else {
        toast.error('Failed to send test notification')
      }
    } catch (error) {
      toast.error('Error sending test notification')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-12 bg-card rounded-[32px] border">
      <Loader2 className="h-6 w-6 animate-spin text-[#7c3aed]" />
    </div>
  )

  if (!isSupported) return (
    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-[32px] flex items-center gap-4 text-destructive">
      <AlertCircle className="shrink-0" />
      <p className="text-sm font-semibold">Push is not supported on this device.</p>
    </div>
  )

  return (
    <Card className="rounded-[32px] border-none shadow-2xl bg-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black">SamUr Connect</CardTitle>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Global Sync</p>
          </div>
          {isSubscribed ? (
             <Badge className="bg-violet-500/10 text-[#7c3aed] border-violet-500/20">Connected</Badge>
          ) : (
             <Badge variant="outline" className="opacity-50">Disconnected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Violet Toggle Card */}
        <div className={`p-5 rounded-[24px] border transition-all duration-300 ${isSubscribed ? 'bg-violet-50/50 border-violet-100 shadow-inner' : 'bg-muted/30 border-muted'}`}>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-bold">Real-Time Chimes</Label>
            <ShieldCheck className={isSubscribed ? 'text-[#7c3aed]' : 'text-muted-foreground'} size={20} />
          </div>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Unlocks instant chimes and push alerts even when the app is closed.
          </p>
          
          <Button 
            disabled={actionLoading || permission === 'denied'}
            onClick={isSubscribed ? unsubscribe : subscribe}
            className={`w-full rounded-2xl py-6 font-bold transition-all ${
              isSubscribed 
                ? 'bg-background text-slate-900 border-slate-200 hover:bg-muted' 
                : 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-violet-200'
            }`}
          >
            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isSubscribed ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
            {isSubscribed ? 'Pause Notifications' : 'Enable Chimes & Alerts'}
          </Button>
        </div>

        <div className="space-y-3 px-1">
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Delivery Channels</h4>
          <div className="space-y-1">
            {Object.entries(preferences).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <Label className="capitalize text-sm font-bold">
                    {key.replace(/_/g, ' ')}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Alert me for {key.replace(/_/g, ' ')}</p>
                </div>
                <Switch
                  checked={value}
                  disabled={!isSubscribed}
                  onCheckedChange={v => updatePreference(key as keyof NotificationPreferences, v)}
                  className="data-[state=checked]:bg-[#7c3aed]"
                />
              </div>
            ))}
          </div>
        </div>

        {isSubscribed && (
          <div className="px-1">
            <Button
              onClick={sendTestNotification}
              disabled={actionLoading}
              variant="outline"
              className="w-full rounded-2xl py-3 font-bold"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Test Push Notification
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-[10px] font-bold uppercase">
            <AlertCircle size={14} />
            Permissions blocked. Reset in site settings.
          </div>
        )}
      </CardContent>
    </Card>
  )
}