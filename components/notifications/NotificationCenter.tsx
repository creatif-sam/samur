'use client'

import { Loader2 } from 'lucide-react'
import { BellIcon } from './BellIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { notificationIcon, notificationUrl } from '@/lib/notifications/categories'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  data?: { url?: string } | null
}

interface Props {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

export function NotificationCenter({ notifications, unreadCount, loading, onMarkRead, onMarkAllRead }: Props) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          className="relative h-10 w-10 rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 hover:text-white active:scale-95"
        >
          {/* Solid bell that gives a little shake when something is waiting, an outline when caught up */}
          <BellIcon
            filled={unreadCount > 0}
            className={`h-6 w-6 ${unreadCount > 0 ? 'origin-top animate-[bell-ring_0.6s_ease-in-out]' : ''}`}
          />

          {unreadCount > 0 && (
            <>
              {/* A soft pulse behind the count, not around the whole button */}
              <span className="pointer-events-none absolute -right-1 -top-1 h-[18px] w-[18px] animate-ping rounded-full bg-rose-400/60" />
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#1b0c3d]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] mt-2 rounded-2xl p-2 shadow-2xl border-muted/20">
        <div className="flex justify-between items-center px-2 py-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Notifications{unreadCount > 0 && ` · ${unreadCount} new`}
          </span>
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-[10px] font-bold text-primary hover:underline uppercase">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="px-2 py-8 text-center text-sm text-slate-400 italic">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Syncing...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-2 py-10 text-center text-sm text-slate-400">No new updates.</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => {
                  if (!n.read) onMarkRead(n.id)
                  router.push(notificationUrl(n))
                }}
                className={`px-3 py-3 mb-1 rounded-xl transition-all cursor-pointer ${!n.read ? 'bg-primary/5 border-l-4 border-primary' : 'opacity-70'}`}
              >
                <div className="flex gap-3 w-full">
                  <span className="text-xl shrink-0">{notificationIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'} truncate text-foreground flex-1`}>{n.title}</p>
                      <span className="text-[10px] text-slate-400 ml-2 shrink-0">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/protected/notifications')}
          className="justify-center rounded-xl py-2.5 text-xs font-bold text-primary cursor-pointer"
        >
          See all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
