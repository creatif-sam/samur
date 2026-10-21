'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, AlertCircle, Loader2, ShieldCheck, Moon } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryKey,
  type NotificationPreferences,
} from '@/lib/notifications/categories'

const GROUPS = ['Planning', 'Partner', 'Habits'] as const

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
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
      // Unknown or missing columns (e.g. before the migration) fall back to defaults
      const loaded = { ...DEFAULT_PREFERENCES }
      for (const c of NOTIFICATION_CATEGORIES) {
        if (typeof data[c.key] === 'boolean') loaded[c.key] = data[c.key]
      }
      loaded.quiet_start = typeof data.quiet_start === 'string' ? data.quiet_start : null
      loaded.quiet_end = typeof data.quiet_end === 'string' ? data.quiet_end : null
      setPreferences(loaded)
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
      // Check if iOS Safari
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      
      console.log('Device info:', { isIOS, isSafari, userAgent: navigator.userAgent })
      
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        toast.error('Permission denied. Please enable notifications in settings.')
        return
      }

      // Play audio to warm up audio context (helps with iOS)
      const audio = new Audio('/sounds/notification.mp3')
      await audio.play().catch(() => console.log("Audio context warmed up"))

      // Wait for service worker to be ready
      console.log('Waiting for service worker...')
      const registration = await navigator.serviceWorker.ready
      console.log('Service worker ready:', registration.scope)
      
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('VAPID key is missing')
        throw new Error('VAPID Key missing')
      }
      
      console.log('VAPID key loaded, subscribing...')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      console.log('Push subscription successful:', subscription.endpoint)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        throw new Error('User not authenticated')
      }

      const subscriptionJSON = subscription.toJSON()
      
      console.log('Saving subscription to database...')
      // Store subscription with proper structure
      const { error: upsertError } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscriptionJSON.keys,
        subscription: subscriptionJSON
      }, {
        onConflict: 'user_id,endpoint'
      })

      if (upsertError) {
        console.error('Failed to save subscription:', upsertError)
        toast.error(`Failed to save subscription: ${upsertError.message}`)
        return
      }

      console.log('Subscription saved successfully')
      setIsSubscribed(true)
      toast.success('SamUr Connect: Notifications Active 🤍')
    } catch (error: any) {
      console.error('Subscription error:', error)
      console.error('Error stack:', error.stack)
      toast.error(`Failed to subscribe: ${error.message || 'Unknown error'}`)
    } finally { 
      setActionLoading(false) 
    }
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

  const savePreferences = async (patch: Partial<NotificationPreferences>) => {
    const previous = preferences
    const updated = { ...preferences, ...patch }
    setPreferences(updated)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Update the existing row, or create it on first change
    const updateRes = await supabase
      .from('notification_preferences')
      .update(patch)
      .eq('user_id', user.id)
      .select('user_id')
    const updatedRows = updateRes.data
    let error = updateRes.error
    if (!error && (!updatedRows || updatedRows.length === 0)) {
      ;({ error } = await supabase.from('notification_preferences').insert({ user_id: user.id, ...updated }))
    }
    if (error) {
      console.error('Failed to save notification preferences', error)
      toast.error('Could not save. If this keeps happening, the latest database update may not be installed yet.')
      setPreferences(previous)
    }
  }

  const updatePreference = (key: NotificationCategoryKey, value: boolean) => savePreferences({ [key]: value })

  const quietEnabled = !!(preferences.quiet_start && preferences.quiet_end)

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
          type: 'system',
          title: 'Test Notification',
          body: 'This is a test push notification from SamUr!',
          url: '/protected'
        })
      })

      const result = await response.json()

      if (response.ok && result.pushed > 0) {
        toast.success(`Test notification sent to ${result.pushed > 1 ? `${result.pushed} devices` : 'your device'}!`)
      } else if (response.ok) {
        toast.error(result.skipped === 'no_devices'
          ? 'No device is registered. Turn notifications off and on again on this device.'
          : 'The notification was saved but no device accepted the push.')
      } else {
        console.error('Push notification error:', result)
        toast.error(`Failed: ${result.error}`, {
          description: result.details
        })
      }
    } catch (error: any) {
      console.error('Test notification error:', error)
      toast.error(`Error: ${error.message}`)
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
    <Card id="notifications" className="rounded-[32px] border-none shadow-2xl bg-card overflow-hidden scroll-mt-20">
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

        <div className="space-y-5 px-1">
          <p className="text-[11px] text-muted-foreground px-2 leading-relaxed">
            Choose what you hear about. Switching a category off stops it in the app, on your phone and by email.
          </p>
          {GROUPS.map(group => (
            <div key={group} className="space-y-1">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">{group}</h4>
              {NOTIFICATION_CATEGORIES.filter(c => c.group === group).map(c => (
                <div key={c.key} className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <Label htmlFor={`pref-${c.key}`} className="text-sm font-bold">{c.label}</Label>
                    <p className="text-[11px] text-muted-foreground leading-snug">{c.description}</p>
                  </div>
                  <Switch
                    id={`pref-${c.key}`}
                    checked={preferences[c.key]}
                    onCheckedChange={v => updatePreference(c.key, v)}
                    className="data-[state=checked]:bg-[#7c3aed] shrink-0"
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Quiet hours */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Quiet Hours</h4>
            <div className="p-3 rounded-2xl bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="pref-quiet" className="text-sm font-bold flex items-center gap-1.5"><Moon size={14} /> Don&apos;t buzz me at night</Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Notifications still arrive in the app; your phone stays silent. Task reminders you set still come through.
                  </p>
                </div>
                <Switch
                  id="pref-quiet"
                  checked={quietEnabled}
                  onCheckedChange={v => savePreferences(v ? { quiet_start: '22:00', quiet_end: '07:00' } : { quiet_start: null, quiet_end: null })}
                  className="data-[state=checked]:bg-[#7c3aed] shrink-0"
                />
              </div>
              {quietEnabled && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">From</span>
                  <input
                    type="time"
                    value={preferences.quiet_start ?? ''}
                    onChange={e => e.target.value && savePreferences({ quiet_start: e.target.value })}
                    className="flex-1 min-w-0 rounded-xl border bg-background px-2 py-1.5 text-sm font-semibold"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="time"
                    value={preferences.quiet_end ?? ''}
                    onChange={e => e.target.value && savePreferences({ quiet_end: e.target.value })}
                    className="flex-1 min-w-0 rounded-xl border bg-background px-2 py-1.5 text-sm font-semibold"
                  />
                </div>
              )}
            </div>
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

        {/* iOS Troubleshooting */}
        {typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold">
              <AlertCircle size={16} />
              iOS Setup Tips
            </div>
            <ul className="text-xs space-y-1 text-blue-900 dark:text-blue-200">
              <li>• Requires iOS 16.4+ and Safari browser</li>
              <li>• Add app to Home Screen first (Share → Add to Home Screen)</li>
              <li>• Open from Home Screen icon, not Safari</li>
              <li>• Enable in Settings → Safari → Advanced → Experimental Features → "Notifications"</li>
              <li>• If still failing, delete app from Home Screen and re-add</li>
            </ul>
            {!isSubscribed && (
              <div className="pt-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                Current browser: {/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? '✅ Safari' : '❌ Not Safari (use Safari)'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}