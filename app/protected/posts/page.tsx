'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation' // Added for URL persistence
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
import { Plus, BookOpen, MessageSquare, Loader2, NotebookPen } from 'lucide-react' 
import PostCard from '@/components/posts/PostCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs' 
import { ThoughtBook } from '@/components/note/ThoughtBook' 

type PostWithProfile = Post & { profiles: Profile }

export default function PostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL Persistence: Read the current tab from the URL (?tab=...)
  const activeTab = searchParams.get('tab') || 'posts'

  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [notebooks, setNotebooks] = useState<any[]>([]) 
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

    const [postsRes, notebooksRes] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (name, avatar_url),
          meditations (id, title, scripture, lesson)
        `)
        .or(`visibility.eq.shared,partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('notebooks')
        .select(`*, sections (*, pages (*))`) 
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ])

    setPosts(postsRes.data ?? [])
    setNotebooks(notebooksRes.data ?? [])
    setLoading(false)
  }

  // Persist Tab Change to URL
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`?${params.toString()}`, { scroll: false })
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* CONTROLLED TABS: value and onValueChange handle the URL sync */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace</h1>
          </div>
          
          <TabsList className="bg-muted/50 p-1 rounded-lg border h-10">
            <TabsTrigger value="posts" className="rounded-md px-4 text-xs font-medium gap-2 transition-all">
              <MessageSquare className="w-3.5 h-3.5" /> Feed
            </TabsTrigger>
            <TabsTrigger value="thoughty" className="rounded-md px-4 text-xs font-medium gap-2 transition-all">
              <BookOpen className="w-3.5 h-3.5" /> Notebooks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="posts" className="space-y-6 mt-0 outline-none focus-visible:ring-0 animate-in fade-in duration-300">
          <header className="flex items-center justify-between">
            <FeedSwitch />
            <div className="flex items-center gap-2">
              <MeditationButton onOpen={() => setShowMeditationComposer(true)} />
              <Button size="sm" onClick={() => setShowComposer(!showComposer)} className="rounded-full px-4 font-medium">
                <Plus className="w-4 h-4 mr-1" /> New Post
              </Button>
            </div>
          </header>

          {showComposer && (
            <Card className="shadow-sm border-muted-foreground/20">
              <CardContent className="p-4 space-y-4">
                <Textarea
                  placeholder="Capture a thought..."
                  className="min-h-[140px] border-none focus-visible:ring-0 resize-none p-0 text-base placeholder:text-muted-foreground/50"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-between border-t pt-4">
                  <Select 
                    disabled={isSubmitting}
                    value={visibility} 
                    onValueChange={v => setVisibility(v as 'private' | 'shared')}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs border-muted/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowComposer(false)} className="text-xs" disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={createPost} disabled={isSubmitting || !content.trim()} className="text-xs px-6">
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
        </TabsContent>

        <TabsContent value="thoughty" className="mt-0 outline-none focus-visible:ring-0 animate-in fade-in duration-300">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-1 min-h-[600px]">
             <ThoughtBook 
               notebooks={notebooks} 
               onRefresh={loadData} 
               userId={userId} 
             />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}