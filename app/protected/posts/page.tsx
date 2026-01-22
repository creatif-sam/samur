'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Profile } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import MeditationButton from '@/components/posts/MeditationButton'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import FeedSwitch from '@/components/feed/FeedSwitch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import PostCard from '@/components/posts/PostCard'

type PostWithProfile = Post & { profiles: Profile }

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [showMeditationComposer, setShowMeditationComposer] =
    useState(false)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] =
    useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    setUserId(auth.user.id)

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        meditations (
          id,
          title,
          scripture,
          lesson
        )
      `)
      .or(`visibility.eq.shared,partner_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: false })

    setPosts(data ?? [])
    setLoading(false)
  }

  async function createPost() {
    if (!content.trim()) return
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    let partnerId = null
    if (visibility === 'shared') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', auth.user.id)
        .single()
      partnerId = profile?.partner_id
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        visibility,
        author_id: auth.user.id,
        partner_id: partnerId,
      })
      .select(`
        *,
        profiles:author_id (name, avatar_url)
      `)
      .single()

    if (error) {
      console.error(error)
      return
    }

    if (data) {
      setPosts([data, ...posts])
      setContent('')
      setShowComposer(false)
    }
  }

  async function updatePost(id: string, updated: string) {
    const supabase = createClient()
    await supabase.from('posts').update({ content: updated }).eq('id', id)

    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, content: updated } : p)),
    )
  }

  async function deletePost(id: string) {
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading posts
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
   <header className="flex items-center justify-between">
  <h1 className="text-xl font-semibold tracking-tight">Posts</h1>

  <div className="flex items-center gap-3">
    <FeedSwitch />

    <MeditationButton
      onOpen={() => setShowMeditationComposer(true)}
    />

    <Button
      size="sm"
      variant="outline"
      onClick={() => setShowComposer(!showComposer)}
    >
      <Plus className="w-4 h-4 mr-2" />
      Write
    </Button>
  </div>
</header>


      {showComposer && (
        <Card className="border-muted">
          <CardContent className="p-5 space-y-4">
            <Textarea
              placeholder="Write thoughtfully"
              className="min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex items-center justify-between">
              <Select
                value={visibility}
                onValueChange={(v) =>
                  setVisibility(v as 'private' | 'shared')
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowComposer(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createPost}>Publish</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showMeditationComposer && (
        <MeditationComposer
          onClose={() => setShowMeditationComposer(false)}
          onCreated={loadPosts}
        />
      )}

      <section className="space-y-5">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={userId || ''}
            onUpdate={updatePost}
            onDelete={deletePost}
          />
        ))}
      </section>
    </div>
  )
}
