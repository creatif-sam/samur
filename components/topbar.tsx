'use client'

import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { NotificationToast } from '@/components/notifications/NotificationToast'
import { ThemeSwitcher } from '@/components/theme-switcher' // Adjust path as needed
import Link from 'next/link'
import Image from 'next/image'
import { User } from 'lucide-react'

export function Topbar() {
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activePreview, setActivePreview] = useState<any | null>(null)
  const [tick, setTick] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  // Load profile avatar
  useEffect(() => {
    const loadAvatar = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', auth.user.id)
        .single()
      setAvatarUrl(data?.avatar_url ?? null)
    }
    loadAvatar()
  }, [supabase])

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

  // ── App Badging ─────────────────────────────────────────────────────────────
  // Sync the home-screen icon badge with the unread notification count.
  // navigator.setAppBadge() is supported in Chrome/Edge PWAs and iOS 16.4+ PWAs.
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('setAppBadge' in navigator)) return
    if (unreadCount > 0) {
      ;(navigator as any).setAppBadge(unreadCount).catch(() => {})
    } else {
      ;(navigator as any).clearAppBadge().catch(() => {})
    }
  }, [unreadCount])

  // When the user brings the app back to the foreground with nothing unread,
  // ensure any residual badge left by the service worker is cleared.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && unreadCount === 0) {
        if ('clearAppBadge' in navigator) {
          ;(navigator as any).clearAppBadge().catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [unreadCount])
  // ────────────────────────────────────────────────────────────────────────────

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
        <div className="flex items-center gap-3">
          <Link href="/protected/profile" className="flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full object-cover ring-2 ring-white/60 hover:ring-white transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
            )}
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">Mastery</h1>
        </div>

        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <NotificationCenter 
            notifications={notifications} 
            unreadCount={unreadCount} 
            loading={loading}
            onMarkRead={markAsRead}
            onMarkAllRead={markAllRead}
          />
        </div>
      </header>
    </>
  )
}