'use client';

import { useTranslation } from '@/contexts/TranslationContext'
import { useState } from 'react';
import { PostComment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { shortAgo } from '@/lib/posts';
import { FormattedContent } from './FormattedContent';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: PostComment;
  currentUserId: string;
  // Replying happens in the post's comment box, which shows "Replying to …"
  onReply: (comment: PostComment) => void;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDelete: (commentId: string) => void;
  loading: boolean;
  depth?: number;
}

// Replies indent up to this depth; deeper ones line up so they stay readable on phones
const MAX_INDENT_DEPTH = 2

// One comment: avatar, the name in bold followed by the words, then time · Reply · Edit · Delete.
// Replies stay folded under "View replies" until opened.
export function CommentItem({ comment, currentUserId, onReply, onEdit, onDelete, loading, depth = 0 }: CommentItemProps) {
  const { tr } = useTranslation()
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const canManage = comment.author_id === currentUserId;
  const replies = comment.replies ?? [];
  const small = depth > 0;

  const handleSaveEdit = async () => {
    if (await onEdit(comment.id, editContent)) setIsEditing(false);
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5">
        <Avatar className={cn('shrink-0', small ? 'h-6 w-6' : 'h-8 w-8')}>
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback className="bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
            {comment.profiles?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea autoFocus value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[60px] text-sm" />
              <div className="flex gap-3 text-xs font-semibold">
                <button onClick={handleSaveEdit} disabled={loading || !editContent.trim()} className="text-violet-600 disabled:opacity-40 dark:text-violet-400">{tr('Save')}</button>
                <button onClick={() => { setIsEditing(false); setEditContent(comment.content) }} className="text-muted-foreground">{tr('Cancel')}</button>
              </div>
            </div>
          ) : (
            <p className="break-words text-sm leading-snug">
              <span className="mr-1.5 font-semibold">{comment.profiles?.name || tr('Anonymous')}</span>
              <span className="text-foreground/90"><FormattedContent content={comment.content} /></span>
            </p>
          )}

          {!isEditing && (
            <div className="mt-1 flex items-center gap-3.5 text-xs font-semibold text-muted-foreground">
              <span className="font-normal">{shortAgo(comment.created_at)}</span>
              <button onClick={() => onReply(comment)} className="hover:text-foreground">{tr('Reply')}</button>
              {canManage && (
                <>
                  <button onClick={() => setIsEditing(true)} className="hover:text-foreground">{tr('Edit')}</button>
                  <button
                    onClick={() => {
                      if (window.confirm(replies.length ? tr('Delete this comment and its replies?') : tr('Delete this comment?'))) onDelete(comment.id)
                    }}
                    className="hover:text-red-600"
                  >
                    {tr('Delete')}
                  </button>
                </>
              )}
            </div>
          )}

          {replies.length > 0 && depth < MAX_INDENT_DEPTH && (
            <div className="mt-2.5">
              <button onClick={() => setShowReplies(s => !s)} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                <span className="h-px w-6 bg-muted-foreground/40" />
                {showReplies ? tr('Hide replies') : tr('View replies ({n})', { n: replies.length })}
              </button>
              {showReplies && (
                <div className="mt-3 space-y-3.5">
                  {replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onReply={onReply} onEdit={onEdit} onDelete={onDelete} loading={loading} depth={depth + 1} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Past the indent limit, replies line up underneath instead of moving further right */}
      {replies.length > 0 && depth >= MAX_INDENT_DEPTH && (
        <div className="mt-3.5 space-y-3.5">
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onReply={onReply} onEdit={onEdit} onDelete={onDelete} loading={loading} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
