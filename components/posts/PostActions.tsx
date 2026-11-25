'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { motion } from 'framer-motion'
import { HandHeart, Heart, MessageCircle, Send } from 'lucide-react'
import type { PostReaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PostActionsProps {
  userReaction: PostReaction | null
  likeCount: number
  // "Liked by Urbright" on your own posts, when your partner liked (or prayed for) it
  likedBy: string | null
  // Prayer requests use "I prayed" (a praying hand) instead of a heart
  prayer?: boolean
  onReaction: () => void
  onComment: () => void
  onShare: () => void
  loading: boolean
}

// An icon row (heart, comment, share), then who liked it
export function PostActions({ userReaction, likeCount, likedBy, prayer, onReaction, onComment, onShare, loading }: PostActionsProps) {
  const { tr } = useTranslation()
  const on = !!userReaction
  const Icon = prayer ? HandHeart : Heart
  return (
    <div className="px-2.5 pt-1.5">
      <div className="flex items-center">
        <button
          onClick={onReaction}
          disabled={loading}
          aria-pressed={on}
          aria-label={prayer ? (on ? tr('Prayed') : tr('I prayed')) : on ? tr('Unlike') : tr('Like')}
          className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-muted/60 disabled:opacity-70"
        >
          <motion.span
            key={on ? 'on' : 'off'}
            initial={on ? { scale: 0.6 } : false}
            animate={{ scale: on ? [0.6, 1.25, 1] : 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid place-items-center"
          >
            <Icon
              strokeWidth={on ? 2 : 1.75}
              className={cn(
                'h-[26px] w-[26px] transition-colors',
                on ? (prayer ? 'fill-violet-500 text-violet-600 dark:text-violet-400' : 'fill-[#ff3040] text-[#ff3040]') : 'text-foreground',
              )}
            />
          </motion.span>
        </button>
        <button onClick={onComment} aria-label={tr('Comment')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted/60">
          <MessageCircle strokeWidth={1.75} className="h-[25px] w-[25px] -scale-x-100 text-foreground" />
        </button>
        <button onClick={onShare} aria-label={tr('Share')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted/60">
          <Send strokeWidth={1.75} className="h-[23px] w-[23px] -rotate-12 text-foreground" />
        </button>
      </div>
      {(likedBy || likeCount > 0) && (
        <p className="px-1.5 text-sm font-semibold">
          {likedBy ?? (prayer
            ? tr('{n} {n:person prayed|people prayed}', { n: likeCount })
            : tr('{n} {n:like|likes}', { n: likeCount }))}
        </p>
      )}
    </div>
  )
}
