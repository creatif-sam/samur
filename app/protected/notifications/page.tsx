'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { BellOff, CheckCheck, ChevronLeft, Loader2, Settings, Trash2 } from 'lucide-react'
import { notificationIcon, notificationUrl } from '@/lib/notifications/categories'
import type { AppNotification } from '@/components/notifications/NotificationCenter'

const PAGE_SIZE = 30

// Let the bell in the top bar re-sync its list and unread count
function announceChange() {
  window.dispatchEvent(new Event('notifications-changed'))
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => { loadPage(0) }, [])

  async function loadPage(offset: number) {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setItems(prev => (offset === 0 ? data.notifications : [...prev, ...data.notifications]))
      setHasMore(!!data.hasMore)
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      toast.error("Couldn't load notifications")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function open(n: AppNotification) {
    if (!n.read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)))
      setUnreadCount(c => Math.max(0, c - 1))
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: n.id }),
      }).then(announceChange)
    }
    router.push(notificationUrl(n))
  }

  async function markAllRead() {
    setItems(prev => prev.map(x => ({ ...x, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
    announceChange()
  }

  async function remove(n: AppNotification) {
    setItems(prev => prev.filter(x => x.id !== n.id))
    if (!n.read) setUnreadCount(c => Math.max(0, c - 1))
    const res = await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id }),
    })
    if (!res.ok) {
      toast.error("Couldn't delete the notification")
      loadPage(0)
      return
    }
    announceChange()
  }

  async function clearRead() {
    const before = items
    setItems(prev => prev.filter(x => !x.read))
    const res = await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allRead: true }),
    })
    if (!res.ok) {
      setItems(before)
      toast.error("Couldn't clear notifications")
      return
    }
    toast.success('Read notifications cleared')
    announceChange()
  }

  const visible = filter === 'unread' ? items.filter(n => !n.read) : items
  const hasRead = items.some(n => n.read)

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28">
      <div className="sticky top-[60px] z-20 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border/40 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-black">Notifications</h1>
          <p className="text-[11px] text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        <Link href="/protected/profile#notifications" aria-label="Notification settings" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-center gap-2 py-3">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${filter === f ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-muted">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          {hasRead && (
            <button onClick={clearRead} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-muted">
              <Trash2 className="w-3.5 h-3.5" /> Clear read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BellOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map(n => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${n.read ? 'border-border bg-card opacity-75' : 'border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/10'}`}
            >
              <button onClick={() => open(n)} className="flex items-start gap-3 min-w-0 flex-1 text-left">
                <span className="text-xl shrink-0">{notificationIcon(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read ? 'font-medium' : 'font-bold'} text-foreground`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
              <button
                onClick={() => remove(n)}
                aria-label="Delete notification"
                className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:bg-muted active:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore && filter === 'all' && (
        <button
          onClick={() => loadPage(items.length)}
          disabled={loadingMore}
          className="w-full mt-4 py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground disabled:opacity-60"
        >
          {loadingMore ? 'Loading…' : 'Load older'}
        </button>
      )}
    </div>
  )
}
