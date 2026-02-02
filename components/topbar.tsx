'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NotificationToast } from '@/components/notifications/NotificationToast'

export function Topbar() {
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activePreview, setActivePreview] = useState<any | null>(null)
  const [tick, setTick] = useState(0)
  
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  // Heartbeat to refresh time labels
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let channel: any
    const notificationSound = new Audio('/sounds/notification.mp3')

    const setup = async () => {
      await fetchNotifications()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('notifications-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          payload => {
            const newNotif = payload.new
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(prev => prev + 1)
            setActivePreview(newNotif)
            setTimeout(() => setActivePreview(null), 5000)
            notificationSound.play().catch(() => {})
          }
        ).subscribe()
    }
    setup()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [mounted])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.notifications?.filter((n: any) => !n.read).length || 0)
    } finally { setLoading(false) }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount(c => Math.max(0, c - 1))
    await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: id }) })
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
  }

  return (
    <>
      <NotificationToast notification={activePreview} onClose={() => setActivePreview(null)} />
      
      <header className="sticky top-0 z-50 w-full px-4 py-3 flex items-center justify-between shadow-lg" style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #000 100%)' }}>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">SamUr🤍</h1>

        <div className="flex items-center gap-1">
          <NotificationCenter 
            notifications={notifications} 
            unreadCount={unreadCount} 
            loading={loading}
            onMarkRead={markAsRead}
            onMarkAllRead={markAllRead}
          />
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>
    </>
  )
}