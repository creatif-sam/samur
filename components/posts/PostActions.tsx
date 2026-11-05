import { HandHeart, Heart, MessageCircle } from 'lucide-react'
import type { PostReaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PostActionsProps {
  userReaction: PostReaction | null
  likeCount: number
  commentCount: number
  likedBy: string | null
  // Prayer requests use "I prayed" instead of "Like"
  prayer?: boolean
  showComments: boolean
  onReaction: () => void
  onToggleComments: () => void
  loading: boolean
}

export function PostActions({ userReaction, likeCount, commentCount, likedBy, prayer, showComments, onReaction, onToggleComments, loading }: PostActionsProps) {
  const Icon = prayer ? HandHeart : Heart
  const on = prayer
    ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300'
    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
  return (
    <div className="px-4 pb-3">
      {likedBy && (
        <p className={cn('mb-2 flex items-center gap-1 text-[11px] font-semibold', prayer ? 'text-violet-600 dark:text-violet-300' : 'text-rose-500')}>
          <Icon className="h-3 w-3 fill-current" /> {likedBy}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
        <button
          onClick={onReaction}
          disabled={loading}
          aria-pressed={!!userReaction}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-60',
            userReaction ? on : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <Icon className={cn('h-4 w-4 transition-transform', userReaction && !prayer && 'fill-current', userReaction && 'scale-110')} />
          {prayer ? (userReaction ? 'Prayed' : 'I prayed') : userReaction ? 'Liked' : 'Like'}
          {likeCount > 0 && <span className="tabular-nums opacity-70">{likeCount}</span>}
        </button>
        <button
          onClick={onToggleComments}
          aria-expanded={showComments}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition active:scale-95',
            showComments ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>
    </div>
  )
}
