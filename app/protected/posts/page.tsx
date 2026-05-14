'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Profile } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, HandHeart, BookOpen, NotebookPen } from 'lucide-react'
import PostCard from '@/components/posts/PostCard'
import MeditationsTab from '@/components/meditations/MeditationsTab'
import PrayerTab from '@/components/prayer/PrayerTab'

type Tab = 'meditations' | 'prayer' | 'posts'
type PostWithProfile = Post & { profiles: Profile }

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'meditations', label: 'Meditations', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'prayer',      label: 'Prayer',      icon: <HandHeart className="w-3.5 h-3.5" /> },
  { id: 'posts',       label: 'Posts',       icon: <NotebookPen className="w-3.5 h-3.5" /> },
]

function PostsTab() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { setLoading(false); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('posts')
      .select(`*, profiles:author_id (name, avatar_url), meditations (id, title, scripture, lesson)`)
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
      if (!res.ok) { alert(`Error: ${result.error || 'Failed to publish post'}`); return }
      setContent('')
      setShowComposer(false)
      await loadData()
    } catch (err) {
      console.error('Network error while posting:', err)
      alert('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updatePost(id: string, updated: string) {
    const supabase = createClient()
    await supabase.from('posts').update({ content: updated }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: updated } : p))
  }

  async function deletePost(id: string) {
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading || !userId) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowComposer(v => !v)} className="rounded-full px-4 font-medium">
          <Plus className="w-4 h-4 mr-1" /> New Post
        </Button>
      </div>

      {showComposer && (
        <Card className="shadow-sm border-muted-foreground/20">
          <CardContent className="p-3 md:p-4 space-y-3">
            <Textarea
              placeholder="Capture a thought..."
              className="min-h-[120px] border-none focus-visible:ring-0 resize-none p-0 text-sm placeholder:text-muted-foreground/50"
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-3">
              <Select disabled={isSubmitting} value={visibility} onValueChange={v => setVisibility(v as 'private' | 'shared')}>
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs border-muted/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowComposer(false)} className="text-xs flex-1 sm:flex-none" disabled={isSubmitting}>Cancel</Button>
                <Button size="sm" onClick={createPost} disabled={isSubmitting || !content.trim()} className="text-xs px-6 flex-1 sm:flex-none">
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={userId} onUpdate={updatePost} onDelete={deletePost} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <NotebookPen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No posts yet. Share something.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function FeedPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('meditations')

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6">

      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Feed</h1>
      </div>

      {/* Tab bar */}
      <div className="flex bg-muted/50 rounded-2xl p-1 mb-6 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'meditations' && <MeditationsTab />}
      {activeTab === 'prayer'      && <PrayerTab />}
      {activeTab === 'posts'       && <PostsTab />}
    </div>
  )
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <FeedPageContent />
    </Suspense>
  )
}