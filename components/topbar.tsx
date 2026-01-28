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

    const setup = async () => {
      await fetchNotifications()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            setNotifications(prev => [payload.new as Notification, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setup()
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
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'message': return '💬'
      case 'planner_reminder': return '📅'
      case 'goal_deadline': return '🎯'
      case 'goal_progress': return '📈'
      case 'post': return '📝'
      default: return '🔔'
    }
  }

  return (
    <header
      className="sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-between"
      style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #000 100%)' }}
    >
      <h1 className="text-lg font-semibold tracking-tight text-white">
        SamUr🤍
      </h1>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 relative"
            >
              <Bell className="w-5 h-5" />
              {mounted && unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <div className="px-2 py-1.5 text-sm font-medium">
              Notifications
            </div>

            <DropdownMenuSeparator />

            {!mounted || loading ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 5).map(n => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-3 py-3 ${!n.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex gap-3 w-full">
                    <span>{iconFor(n.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      {mounted && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(
                            new Date(n.created_at),
                            { addSuffix: true }
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}

            {mounted && unreadCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={markAllAsRead}
                  className="text-center text-sm text-blue-600"
                >
                  Mark all as read
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
