'use client';

import { useMemo, useState } from 'react';
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
import { CommentSection } from './CommentSection';
import { FormattedContent } from './FormattedContent';
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
  const [reactions, setReactions] = useState<PostReaction[]>(initialReactions);
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
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
  const isLong = body.length > FOLD_CHARS || body.split('\n').length > FOLD_LINES;
  const [expanded, setExpanded] = useState(false);
  // On a prayer request, a "like" means "I prayed for this"
  const isPrayer = kind === 'prayer';
  const answered = isPrayer && !!post.answered_at;
  // On your own posts, show that your partner liked (or prayed for) it
  const likedBy = isMine && reactions.some(r => r.user_id !== currentUserId)
    ? `${partnerName || 'Your partner'} ${isPrayer ? 'prayed for this' : 'liked this'}`
    : null;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success('Copied');
    } catch {
      toast.error("Couldn't copy");
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
        toast.error(result.error || "Couldn't post your comment");
        return false;
      }
      setComments(prev => [...prev, result.comment]);
      return true;
    } catch {
      toast.error("Couldn't post your comment. Check your connection.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (await postComment(newComment)) setNewComment('');
  };

  const handleReply = (parentId: string, content: string) => postComment(content, parentId);

  const handleEditComment = async (commentId: string, content: string) => {
    if (!content.trim()) return false;
    setLoading(true);
    const { error } = await createClient().from('post_comments').update({ content: content.trim() }).eq('id', commentId);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Couldn't save the comment");
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
      toast.error(error.message || "Couldn't delete the comment");
    }
  };

  // --- REACTIONS ---
  const handleReaction = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();

    if (userReaction) {
      const { error } = await supabase.from('post_reactions').delete().eq('id', userReaction.id);
      if (error) toast.error(error.message || "Couldn't remove your like");
      else setReactions(prev => prev.filter(r => r.id !== userReaction.id));
    } else {
      const { data, error } = await supabase.from('post_reactions').insert({
        post_id: post.id, user_id: currentUserId, reaction: 'like'
      }).select().single();
      if (error || !data) {
        toast.error(error?.message || "Couldn't like the post");
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
    if (!text) return;
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

      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="min-h-[100px] text-sm"
              disabled={savingEdit}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={savingEdit}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={savingEdit || !editText.trim()}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {answered ? (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                🙌 Prayer answered · {new Date(post.answered_at!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            ) : kindMeta && (
              <span className={cn('mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', kindMeta.pill)}>
                {kindMeta.emoji} {kindMeta.label}
              </span>
            )}
            <p
              className={cn(
                'whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90',
                isLong && !expanded && !highlight && 'line-clamp-[8]',
              )}
            >
              <FormattedContent content={body} highlight={highlight} />
            </p>
            {isLong && !highlight && (
              <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </>
        )}
      </div>

      <PostActions
        userReaction={userReaction}
        likeCount={reactions.length}
        commentCount={comments.length}
        likedBy={likedBy}
        prayer={isPrayer}
        showComments={showComments}
        onReaction={handleReaction}
        onToggleComments={() => setShowComments(!showComments)}
        loading={loading}
      />

      {showComments && (
        <CommentSection
          comments={tree}
          newComment={newComment}
          setNewComment={setNewComment}
          onComment={handleComment}
          onReply={handleReply}
          onEdit={handleEditComment}
          onDelete={handleDeleteComment}
          currentUserId={currentUserId}
          loading={loading}
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={open => !deleting && setConfirmDelete(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>Its likes and comments will be deleted too. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeletePost} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
