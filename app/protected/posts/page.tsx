'use client'

import { useState, useEffect, Suspense } from 'react'
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
import { Plus, MessageSquare, Loader2, NotebookPen } from 'lucide-react'
import PostCard from '@/components/posts/PostCard'

type PostWithProfile = Post & { profiles: Profile }

function PostsPageContent() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [showMeditationComposer, setShowMeditationComposer] = useState(false)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      setLoading(false)
      return
    }

    setUserId(user.id)

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        meditations (id, title, scripture, lesson)
      `)
      .or(`visibility.eq.shared,partner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    setPosts(data ?? [])
    setLoading(false)
  }

  async function createPost() {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility: visibility.toLowerCase() }),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(`Error: ${result.error || 'Failed to publish post'}`)
        return
      }

      setContent('')
      setShowComposer(false)
      await loadData()
    } catch (err) {
      console.error("📡 Network error while posting:", err)
      alert("Network error. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updatePost(id: string, updated: string) {
    const supabase = createClient()
    await supabase.from('posts').update({ content: updated }).eq('id', id)
    setPosts(prev => prev.map(p => (p.id === id ? { ...p, content: updated } : p)))
  }

  async function deletePost(id: string) {
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading || !userId) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 border-b pb-3 md:pb-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Feed</h1>
          </div>
        </div>

        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <FeedSwitch />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MeditationButton onOpen={() => setShowMeditationComposer(true)} />
            <Button size="sm" onClick={() => setShowComposer(!showComposer)} className="rounded-full px-4 font-medium flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-1" /> New Post
            </Button>
          </div>
        </header>

        {showComposer && (
          <Card className="shadow-sm border-muted-foreground/20">
            <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
              <Textarea
                placeholder="Capture a thought..."
                className="min-h-[120px] md:min-h-[140px] border-none focus-visible:ring-0 resize-none p-0 text-sm md:text-base placeholder:text-muted-foreground/50"
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-3 md:pt-4">
                <Select 
                  disabled={isSubmitting}
                  value={visibility} 
                  onValueChange={v => setVisibility(v as 'private' | 'shared')}
                >
                  <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs border-muted/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowComposer(false)} className="text-xs flex-1 sm:flex-none" disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createPost} disabled={isSubmitting || !content.trim()} className="text-xs px-6 flex-1 sm:flex-none">
                    {isSubmitting ? 'Publishing...' : 'Publish'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showMeditationComposer && (
          <MeditationComposer onClose={() => setShowMeditationComposer(false)} onCreated={loadData} />
        )}

        <section className="space-y-4">
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUserId={userId} 
              onUpdate={updatePost} 
              onDelete={deletePost} 
            />
          ))}
        </section>
      </div>
    </div>
  )
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PostsPageContent />
    </Suspense>
  )
}