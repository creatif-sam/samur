'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post, PostReaction, PostComment, Profile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

// Sub-components
import { PostHeader } from './PostHeader';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';

type PostWithProfile = Post & { profiles: Profile };

interface PostCardProps {
  post: PostWithProfile;
  currentUserId: string;
  onUpdate?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export default function PostCard({ post, currentUserId, onUpdate, onDelete }: PostCardProps) {
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [comments, setComments] = useState<any[]>([]); // Using any[] to match the nested replies structure
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [userReaction, setUserReaction] = useState<PostReaction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();
    fetchComments();
  }, [post.id]);

  // --- DATA FETCHING ---
  const fetchReactions = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('post_reactions').select('*').eq('post_id', post.id);
    setReactions(data || []);
    setUserReaction(data?.find(r => r.user_id === currentUserId) || null);
  };

  const fetchComments = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles:author_id (name, avatar_url)')
      .eq('post_id', post.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (data) {
      const withReplies = await Promise.all(data.map(async (c) => {
        const { data: replies } = await supabase
          .from('post_comments')
          .select('*, profiles:author_id (name, avatar_url)')
          .eq('parent_comment_id', c.id);
        return { ...c, replies: replies || [] };
      }));
      setComments(withReplies);
    }
  };

  // --- COMMENT ACTIONS (Professional Logic) ---
  const handleComment = async () => {
    if (!newComment.trim() || loading) return;
    setLoading(true);

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, content: newComment }),
    });

    if (res.ok) {
      const { comment } = await res.json();
      setComments(prev => [...prev, { ...comment, replies: [] }]);
      setNewComment('');
    }
    setLoading(false);
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!content.trim() || loading) return;
    setLoading(true);
    const supabase = createClient();
    
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, author_id: currentUserId, parent_comment_id: parentId, content })
      .select('*, profiles:author_id (name, avatar_url)')
      .single();

    if (data) {
      setComments(prev => prev.map(c => 
        c.id === parentId ? { ...c, replies: [...(c.replies || []), data] } : c
      ));
    }
    setLoading(false);
  };

  const handleEditComment = async (commentId: string, content: string) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
    
    if (!error) {
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, content };
        if (c.replies) return { ...c, replies: c.replies.map((r: any) => r.id === commentId ? { ...r, content } : r) };
        return c;
      }));
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient();
    await supabase.from('post_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId).map(c => ({
      ...c, replies: c.replies?.filter((r: any) => r.id !== commentId)
    })));
  };

  // --- REACTION ACTIONS ---
  const handleReaction = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();

    if (userReaction) {
      await supabase.from('post_reactions').delete().eq('id', userReaction.id);
      setReactions(prev => prev.filter(r => r.id !== userReaction.id));
      setUserReaction(null);
    } else {
      const { data } = await supabase.from('post_reactions').insert({
        post_id: post.id, user_id: currentUserId, reaction: 'like'
      }).select().single();
      if (data) {
        setReactions(prev => [...prev, data]);
        setUserReaction(data);
      }
    }
    setLoading(false);
  };

  return (
    <Card className="mb-4 overflow-hidden border-muted-foreground/10 shadow-sm">
      <PostHeader 
        post={post} 
        currentUserId={currentUserId} 
        onUpdate={onUpdate} 
        onDelete={onDelete} 
      />
      
      <CardContent className="pt-0">
        <p className="text-sm mb-4 whitespace-pre-wrap px-1">{post.content}</p>
      </CardContent>

      <PostActions 
        userReaction={userReaction}
        likeCount={reactions.length}
        commentCount={comments.length}
        onReaction={handleReaction}
        onToggleComments={() => setShowComments(!showComments)}
        loading={loading}
      />

      {showComments && (
        <CommentSection 
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          onComment={handleComment}
          onReply={handleReply}
          onEdit={handleEditComment}
          onDelete={handleDeleteComment}
          currentUserId={currentUserId}
          loading={loading}
          setComments={setComments} // FIX: Now correctly uses the local state setter
        />
      )}
    </Card>
  );
}