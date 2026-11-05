import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Lock, Users, Copy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Post, Profile } from '@/lib/types'

interface PostHeaderProps {
  post: Post & { profiles?: Profile | null }
  currentUserId: string
  isNew?: boolean
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
}

export function PostHeader({ post, currentUserId, isNew, onEdit, onDelete, onCopy }: PostHeaderProps) {
  const isMine = currentUserId === post.author_id
  const created = new Date(post.created_at)
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback className={isMine ? 'bg-violet-600 text-white font-bold' : 'bg-rose-500 text-white font-bold'}>
            {post.profiles?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm truncate">{isMine ? 'You' : post.profiles?.name || 'Your partner'}</p>
            {isNew && <span className="rounded-full bg-violet-600 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-white">New</span>}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground" title={created.toLocaleString()}>
            <span>{formatDistanceToNow(created, { addSuffix: true })}</span>
            <span aria-hidden>·</span>
            {post.visibility === 'shared'
              ? <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" /> Shared</span>
              : <span className="inline-flex items-center gap-0.5"><Lock className="h-3 w-3" /> Only me</span>}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" aria-label="Post options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopy}><Copy className="h-4 w-4 mr-2" /> Copy text</DropdownMenuItem>
          {isMine && <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>}
          {isMine && <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
