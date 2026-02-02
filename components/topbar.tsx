'use client'

import { Bell, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  data?: any
}

export function Topbar() {
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let channel: any

    const setup = async () => {
      // 1. Initial Load
      await fetchNotifications()

      // 2. Get current user for the real-time filter
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // REAL-TIME LISTENER: Instantly updates when your partner interacts
      channel = supabase
        .channel('notifications-live')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            const newNotif = payload.new as Notification
            // Add to the top of the list and increment badge
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Optional: Play a subtle notification sound here
            if ('Notification' in window && Notification.permission === 'granted') {
               new Notification(newNotif.title, { body: newNotif.body });
            }
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [mounted])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) return

      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(
        data.notifications?.filter((n: Notification) => !n.read).length || 0
      )
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount(c => Math.max(0, c - 1))

    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'comment': return '💬' // Added for professional interactions
      case 'message': return '✉️'
      case 'planner_reminder': return '📅'
      case 'goal_deadline': return '🎯'
      case 'post': return '📝'
      default: return '🔔'
    }
  }

  return (
    <header
      className="sticky top-0 z-50 w-full px-4 py-3 flex items-center justify-between shadow-lg"
      style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #000 100%)' }}
    >
      <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
        SamUr<span className="text-red-400">🤍</span>
      </h1>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 relative rounded-full focus-visible:ring-0"
            >
              <Bell className="w-5 h-5" />
              {mounted && unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold border-2 border-indigo-600 rounded-full animate-in zoom-in"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 mt-2 rounded-2xl p-2 shadow-2xl border-muted/20">
            <div className="flex justify-between items-center px-2 py-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-primary hover:underline uppercase"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <DropdownMenuSeparator />

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="px-2 py-8 text-center text-sm text-slate-400 italic">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Syncing SamUr...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-2 py-10 text-center text-sm text-slate-400">
                  No new updates yet.
                </div>
              ) : (
                notifications.map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className={`px-3 py-3 mb-1 rounded-xl transition-all cursor-pointer ${
                      !n.read 
                        ? 'bg-primary/5 border-l-4 border-primary' 
                        : 'opacity-70'
                    }`}
                  >
                    <div className="flex gap-3 w-full">
                      <span className="text-xl shrink-0">{iconFor(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'} truncate text-foreground`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 rounded-full"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}