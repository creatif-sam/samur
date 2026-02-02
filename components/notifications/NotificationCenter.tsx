'use client'

import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function NotificationCenter({ 
  notifications, 
  unreadCount, 
  loading, 
  onMarkRead, 
  onMarkAllRead 
}: any) {
  const router = useRouter()

  const iconFor = (type: string) => {
    switch (type) {
      case 'comment': return '💬'
      case 'meditation': return '🧘'
      case 'post': return '📝'
      case 'planner_reminder': return '📅'
      default: return '🔔'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative rounded-full">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold border-2 border-indigo-600 rounded-full animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 mt-2 rounded-2xl p-2 shadow-2xl border-muted/20">
        <div className="flex justify-between items-center px-2 py-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notifications</span>
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
            notifications.map((n: Notification) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => {
                  if (!n.read) onMarkRead(n.id)
                  router.push('/protected/posts')
                }}
                className={`px-3 py-3 mb-1 rounded-xl transition-all cursor-pointer ${!n.read ? 'bg-primary/5 border-l-4 border-primary' : 'opacity-70'}`}
              >
                <div className="flex gap-3 w-full">
                  <span className="text-xl shrink-0">{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'} truncate text-foreground flex-1`}>{n.title}</p>
                      <span className="text-[10px] text-slate-400 ml-2">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}