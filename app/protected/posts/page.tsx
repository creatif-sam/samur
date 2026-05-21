'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, HandHeart, BookOpen, NotebookPen, Pencil, Users, Lock, Send, BookMarked } from 'lucide-react'
import PostCard from '@/components/posts/PostCard'
import DailyJournalModal from '@/components/posts/DailyJournalModal'
import MeditationsTab from '@/components/meditations/MeditationsTab'
import PrayerTab from '@/components/prayer/PrayerTab'
import { cn } from '@/lib/utils'

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
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { setLoading(false); return }
    setUserId(user.id)
    setUserName(user.user_metadata?.name || 'You')

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
        body: JSON.stringify({ content, visibility }),
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

  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-4 pb-10">

      {/* Daily Journal Button */}
      <button
        onClick={() => setShowJournalModal(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <BookMarked className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Journal My Day</p>
          <p className="text-[11px] text-violet-500 dark:text-violet-400">Saved to Daily Journaling notebook</p>
        </div>
        <Pencil className="w-4 h-4 text-violet-400/60" />
      </button>

      {showJournalModal && (
        <DailyJournalModal onClose={() => setShowJournalModal(false)} />
      )}

      {/* Compose trigger / Composer */}
      {!showComposer ? (
        <button
          onClick={() => setShowComposer(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 border border-border hover:bg-muted/80 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <span className="text-sm text-muted-foreground flex-1">What's on your heart?</span>
          <Pencil className="w-4 h-4 text-muted-foreground/40" />
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Author + visibility row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold leading-none">{userName}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVisibility('shared')}
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors',
                    visibility === 'shared'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Users className="w-3 h-3" /> Shared
                </button>
                <button
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors',
                    visibility === 'private'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Lock className="w-3 h-3" /> Only me
                </button>
              </div>
            </div>
          </div>

          <Textarea
            autoFocus
            placeholder="Share a thought, prayer, or reflection…"
            className="min-h-[120px] border-none focus-visible:ring-0 resize-none px-4 py-2 text-sm placeholder:text-muted-foreground/50 bg-transparent"
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Action bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <button
              onClick={() => { setShowComposer(false); setContent('') }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <Button
              size="sm"
              onClick={createPost}
              disabled={isSubmitting || !content.trim()}
              className="rounded-full px-5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white border-0"
            >
              {isSubmitting
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sharing…</>
                : visibility === 'shared'
                  ? <><Send className="w-3.5 h-3.5 mr-1.5" />Share</>
                  : <><Lock className="w-3.5 h-3.5 mr-1.5" />Save privately</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* Feed */}
      <section className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={userId} onUpdate={updatePost} onDelete={deletePost} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <NotebookPen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nothing shared yet</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share something.</p>
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