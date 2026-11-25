'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { forwardRef } from 'react'
import { Loader2, X } from 'lucide-react'
import type { PostComment } from '@/lib/types'
import { CommentItem } from './CommentItem'
import { cn } from '@/lib/utils'

// The comment list (when open) and, always, a slim "Add a comment…" box under the post.
// Tapping Reply on a comment turns the box into "Replying to …".

interface CommentListProps {
  comments: PostComment[]
  currentUserId: string
  onReply: (comment: PostComment) => void
  onEdit: (commentId: string, content: string) => Promise<boolean>
  onDelete: (commentId: string) => void
  loading: boolean
}

export function CommentList({ comments, currentUserId, onReply, onEdit, onDelete, loading }: CommentListProps) {
  return (
    <div className="space-y-4 px-4 pt-3">
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} onReply={onReply} onEdit={onEdit} onDelete={onDelete} loading={loading} />
      ))}
    </div>
  )
}

interface CommentBoxProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  replyingTo: string | null
  onCancelReply: () => void
  loading: boolean
}

export const CommentBox = forwardRef<HTMLTextAreaElement, CommentBoxProps>(function CommentBox(
  { value, onChange, onSubmit, replyingTo, onCancelReply, loading }, ref,
) {
  const { tr } = useTranslation()
  const ready = !!value.trim() && !loading
  return (
    <div className="mt-2 border-t border-border/60 px-4 py-2.5">
      {replyingTo && (
        <div className="mb-1.5 flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
          <span className="truncate">{tr('Replying to {name}', { name: replyingTo })}</span>
          <button onClick={onCancelReply} aria-label={tr('Cancel')} className="-mr-1 grid h-6 w-6 place-items-center rounded-full hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            // Grow with the text, up to a few lines
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (ready) onSubmit() } }}
          rows={1}
          placeholder={replyingTo ? tr('Add a reply…') : tr('Add a comment…')}
          aria-label={replyingTo ? tr('Add a reply…') : tr('Add a comment…')}
          className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={onSubmit}
          disabled={!ready}
          className={cn('shrink-0 py-1 text-sm font-semibold transition-colors', ready ? 'text-violet-600 hover:text-violet-700 dark:text-violet-400' : 'text-violet-600/40 dark:text-violet-400/40')}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr('Post')}
        </button>
      </div>
    </div>
  )
})
