'use client';

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Post, PostReaction, PostComment, Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Sub-components
import { PostHeader } from './PostHeader';
import { PostActions } from './PostActions';
import { CommentBox, CommentList } from './CommentSection';
import { FormattedContent } from './FormattedContent';
import PostPhotos from './PostPhotos';
import { composePost, kindInfo, parsePost } from '@/lib/posts';
import { cn } from '@/lib/utils';

// Posts longer than this start folded, with a Read more toggle
const FOLD_CHARS = 420;
const FOLD_LINES = 8;

export type PostWithProfile = Post & { profiles: Profile };

interface PostCardProps {
  post: PostWithProfile;
  currentUserId: string;
  initialReactions: PostReaction[];
  // Every comment on the post (any depth), oldest first
  initialComments: PostComment[];
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  isNew?: boolean;
  highlight?: string;
  partnerName?: string;
  onToggleAnswered?: (id: string, answered: boolean) => Promise<boolean>;
}

// Nest a flat comment list by parent_comment_id (replies to replies included)
function buildTree(flat: PostComment[]): PostComment[] {
  const byParent = new Map<string | null, PostComment[]>();
  for (const c of flat) {
    const key = c.parent_comment_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  const attach = (c: PostComment): PostComment => ({ ...c, replies: (byParent.get(c.id) ?? []).map(attach) });
  return (byParent.get(null) ?? []).map(attach);
}

function descendantIds(flat: PostComment[], id: string): string[] {
  const children = flat.filter(c => c.parent_comment_id === id);
  return children.flatMap(c => [c.id, ...descendantIds(flat, c.id)]);
}

export default function PostCard({ post, currentUserId, initialReactions, initialComments, onUpdate, onDelete, isNew, highlight = '', partnerName, onToggleAnswered }: PostCardProps) {
  const { tr } = useTranslation()
  const [reactions, setReactions] = useState<PostReaction[]>(initialReactions);
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  // Set when replying to a comment from the box under the post
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const commentBox = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userReaction = reactions.find(r => r.user_id === currentUserId) ?? null;
  const tree = useMemo(() => buildTree(comments), [comments]);
  const isMine = post.author_id === currentUserId;
  const { kind, body } = parsePost(post.content);
  const kindMeta = kindInfo(kind);
  const photos = post.image_urls ?? [];
  const isLong = body.length > FOLD_CHARS || body.split('\n').length > FOLD_LINES;
  const [expanded, setExpanded] = useState(false);
  // On a prayer request, a "like" means "I prayed for this"
  const isPrayer = kind === 'prayer';
  const answered = isPrayer && !!post.answered_at;
  // On your own posts, show that your partner liked (or prayed for) it
  const partnerReacted = isMine && reactions.some(r => r.user_id !== currentUserId);
  const who = partnerName || tr('Your partner');
  const likedBy = partnerReacted
    ? isPrayer
      ? (userReaction ? tr('{name} and you prayed for this', { name: who }) : tr('{name} prayed for this', { name: who }))
      : (userReaction ? tr('Liked by {name} and you', { name: who }) : tr('Liked by {name}', { name: who }))
    : null;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success(tr('Copied'));
    } catch {
      toast.error(tr('Couldn\'t copy'));
    }
  };

  // --- COMMENTS ---
  const postComment = async (content: string, parentId?: string) => {
    if (!content.trim() || loading) return false;
    setLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content, parentId }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.error || tr('Couldn\'t post your comment'));
        return false;
      }
      setComments(prev => [...prev, result.comment]);
      return true;
    } catch {
      toast.error(tr('Couldn\'t post your comment. Check your connection.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (await postComment(newComment, replyTo?.id)) {
      setNewComment('');
      if (commentBox.current) commentBox.current.style.height = 'auto';
      // Show the new comment (or reply) in the open list
      setReplyTo(null);
      setShowComments(true);
    }
  };

  const focusCommentBox = () => setTimeout(() => commentBox.current?.focus(), 0);

  const startReply = (comment: PostComment) => {
    setReplyTo(comment);
    focusCommentBox();
  };

  // Share the words through the phone's share sheet, or copy them
  const sharePost = async () => {
    const text = body || post.content;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      toast.success(tr('Copied'));
    } catch { /* closed the share sheet */ }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!content.trim()) return false;
    setLoading(true);
    const { error } = await createClient().from('post_comments').update({ content: content.trim() }).eq('id', commentId);
    setLoading(false);
    if (error) {
      toast.error(error.message || tr('Couldn\'t save the comment'));
      return false;
    }
    setComments(prev => prev.map(c => (c.id === commentId ? { ...c, content: content.trim() } : c)));
    return true;
  };

  // Deleting a comment removes its replies too
  const handleDeleteComment = async (commentId: string) => {
    const ids = [commentId, ...descendantIds(comments, commentId)];
    const before = comments;
    setComments(prev => prev.filter(c => !ids.includes(c.id)));
    const { error } = await createClient().from('post_comments').delete().in('id', ids);
    if (error) {
      setComments(before);
      toast.error(error.message || tr('Couldn\'t delete the comment'));
    }
  };

  const likeFromPhoto = () => { if (!userReaction) void handleReaction(); };

  // --- REACTIONS ---
  const handleReaction = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();

    if (userReaction) {
      const { error } = await supabase.from('post_reactions').delete().eq('id', userReaction.id);
      if (error) toast.error(error.message || tr('Couldn\'t remove your like'));
      else setReactions(prev => prev.filter(r => r.id !== userReaction.id));
    } else {
      const { data, error } = await supabase.from('post_reactions').insert({
        post_id: post.id, user_id: currentUserId, reaction: 'like'
      }).select().single();
      if (error || !data) {
        toast.error(error?.message || tr('Couldn\'t like the post'));
      } else {
        setReactions(prev => [...prev, data]);

        // Let the author know (not when liking your own post)
        if (post.author_id && post.author_id !== currentUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          const userName = user?.user_metadata?.name || 'Your partner';
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: post.author_id,
              type: 'like',
              title: isPrayer ? 'Prayed for you 🙏' : 'New Like ❤️',
              body: isPrayer ? `${userName} prayed for your request` : `${userName} liked your post`,
              url: '/protected/posts?tab=posts'
            })
          }).catch(err => console.error('Failed to send notification:', err));
        }
      }
    }
    setLoading(false);
  };

  // --- POST EDIT / DELETE ---
  const saveEdit = async () => {
    const text = editText.trim();
    // A photo post may have no words
    if (!text && !photos.length) return;
    // Only the words are edited; the post type line is kept as it was
    const next = composePost(kind, text);
    if (next === post.content) { setEditing(false); return; }
    setSavingEdit(true);
    const ok = await onUpdate(post.id, next);
    setSavingEdit(false);
    if (ok) setEditing(false);
  };

  const confirmDeletePost = async () => {
    setDeleting(true);
    const ok = await onDelete(post.id);
    setDeleting(false);
    if (ok) setConfirmDelete(false);
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow',
        isNew ? 'border-violet-300 ring-2 ring-violet-500/20 dark:border-violet-500/40' : 'border-border/60',
      )}
    >
      <PostHeader
        post={post}
        currentUserId={currentUserId}
        isNew={isNew}
        onEdit={() => { setEditText(body); setEditing(true); }}
        onDelete={() => setConfirmDelete(true)}
        onCopy={copyText}
        answered={isPrayer && isMine && onToggleAnswered ? answered : undefined}
        onToggleAnswered={() => onToggleAnswered?.(post.id, !answered)}
      />

      {/* Photo posts: the photo first, like a feed; the words come after the icons */}
      {photos.length > 0 && !editing && <PostPhotos urls={photos} onDoubleTap={likeFromPhoto} />}

      {editing ? (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="min-h-[100px] text-sm"
              disabled={savingEdit}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={savingEdit}>{tr('Cancel')}</Button>
              <Button size="sm" onClick={saveEdit} disabled={savingEdit || (!editText.trim() && !photos.length)}>
                {savingEdit ? tr('Saving…') : tr('Save')}
              </Button>
            </div>
          </div>
        </div>
      ) : photos.length === 0 && (
        <div className="px-4 pb-1">
            {answered ? (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {tr('🙌 Prayer answered · {value}', { value: new Date(post.answered_at!).toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' }) })}
              </span>
            ) : kindMeta && (
              <span className={cn('mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', kindMeta.pill)}>
                {kindMeta.emoji} {tr(kindMeta.label)}
              </span>
            )}
            {body && <p
              className={cn(
                'whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90',
                isLong && !expanded && !highlight && 'line-clamp-[8]',
              )}
            >
              <FormattedContent content={body} highlight={highlight} />
            </p>}
            {isLong && !highlight && (
              <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                {expanded ? tr('Show less') : tr('Read more')}
              </button>
            )}
        </div>
      )}

      <PostActions
        userReaction={userReaction}
        likeCount={reactions.length}
        likedBy={likedBy}
        prayer={isPrayer}
        onReaction={handleReaction}
        onComment={() => { setReplyTo(null); focusCommentBox(); }}
        onShare={sharePost}
        loading={loading}
      />

      {photos.length > 0 && !editing && (body || kindMeta || answered) && (
        <div className="px-4 pt-1">
            {answered ? (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {tr('🙌 Prayer answered · {value}', { value: new Date(post.answered_at!).toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' }) })}
              </span>
            ) : kindMeta && (
              <span className={cn('mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', kindMeta.pill)}>
                {kindMeta.emoji} {tr(kindMeta.label)}
              </span>
            )}
            {body && <p
              className={cn(
                'whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90',
                isLong && !expanded && !highlight && 'line-clamp-[8]',
              )}
            >
              <FormattedContent content={body} highlight={highlight} />
            </p>}
            {isLong && !highlight && (
              <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                {expanded ? tr('Show less') : tr('Read more')}
              </button>
            )}
        </div>
      )}

      {/* Comments: a peek at the latest, or the whole list when opened */}
      {comments.length > 0 && !showComments && (
        <div className="space-y-1 px-4 pt-1.5">
          {/* More than the peek shows (older comments, or replies) */}
          {(comments.length > 2 || tree.length < comments.length) && (
            <button onClick={() => setShowComments(true)} className="text-sm text-muted-foreground">
              {tr('View all {n} comments', { n: comments.length })}
            </button>
          )}
          {tree.slice(-2).map(c => (
            <p key={c.id} className="line-clamp-2 break-words text-sm">
              <span className="mr-1.5 font-semibold">{c.profiles?.name || tr('Anonymous')}</span>
              <span className="text-foreground/90">{c.content}</span>
            </p>
          ))}
        </div>
      )}
      {showComments && (
        <>
          <CommentList
            comments={tree}
            currentUserId={currentUserId}
            onReply={startReply}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
            loading={loading}
          />
          <button onClick={() => setShowComments(false)} className="px-4 pt-3 text-sm text-muted-foreground">{tr('Hide comments')}</button>
        </>
      )}

      <CommentBox
        ref={commentBox}
        value={newComment}
        onChange={setNewComment}
        onSubmit={handleComment}
        replyingTo={replyTo ? (replyTo.profiles?.name || tr('Anonymous')) : null}
        onCancelReply={() => setReplyTo(null)}
        loading={loading}
      />

      <Dialog open={confirmDelete} onOpenChange={open => !deleting && setConfirmDelete(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr('Delete this post?')}</DialogTitle>
            <DialogDescription>{tr('Its likes and comments will be deleted too. This can\'t be undone.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>{tr('Cancel')}</Button>
            <Button variant="destructive" onClick={confirmDeletePost} disabled={deleting}>
              {deleting ? tr('Deleting…') : tr('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
