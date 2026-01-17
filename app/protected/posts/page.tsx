'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post, Profile } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Heart, Plus } from 'lucide-react';
import { format } from 'date-fns';

type PostWithProfile = Post & { profiles: Profile };

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'private' | 'shared'>('private');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url)
      `)
      .or(`author_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    setPosts(data || []);
    setLoading(false);
  };

  const createPost = async () => {
    if (!newPostContent.trim()) return;
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content: newPostContent,
        visibility: newPostVisibility,
        author_id: user.id,
      })
      .select(`
        *,
        profiles:author_id (name, avatar_url)
      `)
      .single();

    if (!error && data) {
      setPosts([data, ...posts]);
      setNewPostContent('');
      setShowNewPost(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Button onClick={() => setShowNewPost(!showNewPost)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* New Post Form */}
      {showNewPost && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-between items-center">
              <Select value={newPostVisibility} onValueChange={(value: 'private' | 'shared') => setNewPostVisibility(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setShowNewPost(false)}>
                  Cancel
                </Button>
                <Button onClick={createPost} disabled={!newPostContent.trim()}>
                  Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
              <Button className="mt-4" onClick={() => setShowNewPost(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: PostWithProfile }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              {(post.profiles as Profile)?.name?.[0] || 'U'}
            </div>
            <div>
              <p className="font-medium">{(post.profiles as Profile)?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
          <Badge variant={post.visibility === 'shared' ? 'default' : 'secondary'}>
            {post.visibility}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{post.content}</p>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Heart className="w-4 h-4 mr-1" />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <MessageSquare className="w-4 h-4 mr-1" />
            Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}