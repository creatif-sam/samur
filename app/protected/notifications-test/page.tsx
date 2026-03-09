'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bell, Send, Smartphone, Lock, XCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function NotificationTestPage() {
  const [title, setTitle] = useState('Test Notification 🔔')
  const [body, setBody] = useState('This is a test push notification from SamUr!')
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<{
    permission: boolean
    serviceWorker: boolean
    subscription: boolean
  } | null>(null)

  const supabase = createClient()

  const checkSetup = async () => {
    const results = {
      permission: false,
      serviceWorker: false,
      subscription: false
    }

    // Check notification permission
    if ('Notification' in window) {
      results.permission = Notification.permission === 'granted'
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        results.serviceWorker = !!registration
        
        // Check subscription
        const subscription = await registration.pushManager.getSubscription()
        results.subscription = !!subscription
      } catch (err) {
        console.error('Service worker check failed:', err)
      }
    }

    setTestResults(results)
    return results
  }

  const sendTestNotification = async () => {
    setLoading(true)
    try {
      // First check setup
      const setup = await checkSetup()
      
      if (!setup.permission) {
        toast.error('Please grant notification permission first!')
        return
      }

      if (!setup.subscription) {
        toast.error('Please enable notifications in Profile settings first!')
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in first')
        return
      }

      // Send test notification
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user.id,
          title,
          body,
          url: '/protected'
        })
      })

      const result = await response.json()

      if (response.ok) {
        const deviceText = result.total > 1 ? `${result.sent} device${result.sent > 1 ? 's' : ''}` : 'your device'
        toast.success(`Test notification sent to ${deviceText}!`, {
          description: result.total > 1 ? `${result.sent} succeeded, ${result.failed} failed` : 'Check your screen'
        })
      } else {
        toast.error(`Failed: ${result.error}`, {
          description: result.details
        })
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const sendBackgroundTest = async () => {
    setLoading(true)
    toast.info('Close this app now! Notification arriving in 5 seconds...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    await sendTestNotification()
    setLoading(false)
  }

  const sendLockScreenTest = async () => {
    setLoading(true)
    toast.info('Lock your device now! Notification arriving in 5 seconds...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    await sendTestNotification()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Notification Test Lab
          </h1>
          <p className="text-muted-foreground">
            Test your push notifications for all scenarios
          </p>
        </div>

        {/* System Check Card */}
        <Card className="rounded-3xl border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="text-violet-600" />
              System Check
            </CardTitle>
            <CardDescription>
              Verify your notification setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkSetup} 
              variant="outline" 
              className="w-full rounded-2xl mb-4"
            >
              Run Diagnostics
            </Button>

            {testResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/50">
                  <span className="font-semibold">Notification Permission</span>
                  {testResults.permission ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/50">
                  <span className="font-semibold">Service Worker Active</span>
                  {testResults.serviceWorker ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/50">
                  <span className="font-semibold">Push Subscription</span>
                  {testResults.subscription ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <XCircle className="text-red-600" />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Message Card */}
        <Card className="rounded-3xl border-none shadow-xl">
          <CardHeader>
            <CardTitle>Custom Test Message</CardTitle>
            <CardDescription>
              Create your own notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Amazing News!"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Notification Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Something awesome just happened..."
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Scenarios */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-none shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center">
                <Bell className="w-8 h-8 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Instant Test</h3>
                <p className="text-sm text-muted-foreground">
                  Send notification immediately
                </p>
              </div>
              <Button
                onClick={sendTestNotification}
                disabled={loading}
                className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Background Test</h3>
                <p className="text-sm text-muted-foreground">
                  Close app after clicking
                </p>
              </div>
              <Button
                onClick={sendBackgroundTest}
                disabled={loading}
                variant="outline"
                className="w-full rounded-2xl border-purple-300 hover:bg-purple-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Test Closed App
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Lock Screen Test</h3>
                <p className="text-sm text-muted-foreground">
                  Lock device after clicking
                </p>
              </div>
              <Button
                onClick={sendLockScreenTest}
                disabled={loading}
                variant="outline"
                className="w-full rounded-2xl border-blue-300 hover:bg-blue-50"
              >
                <Lock className="mr-2 h-4 w-4" />
                Test Lock Screen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-4">💡 Testing Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-violet-600 font-bold">1.</span>
                <span>Make sure you've enabled notifications in the Profile page first</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 font-bold">2.</span>
                <span>For background test: Click button, then close/minimize the app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 font-bold">3.</span>
                <span>For lock screen test: Click button, then lock your device</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 font-bold">4.</span>
                <span>Notifications appear even when app is completely closed!</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
