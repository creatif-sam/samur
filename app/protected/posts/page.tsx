'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PostComment, PostReaction } from '@/lib/types'
import { toast } from 'sonner'
import { clearDraft, loadDraft, saveDraft } from '@/lib/offline'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, HandHeart, BookOpen, NotebookPen, Pencil, Users, Lock, Send, BookMarked } from 'lucide-react'
import PostCard, { type PostWithProfile } from '@/components/posts/PostCard'
import DailyJournalModal from '@/components/posts/DailyJournalModal'
import MeditationsTab from '@/components/meditations/MeditationsTab'
import PrayerTab from '@/components/prayer/PrayerTab'
import { cn } from '@/lib/utils'

type Tab = 'meditations' | 'prayer' | 'posts'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'meditations', label: 'Meditations', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'prayer',      label: 'Prayer',      icon: <HandHeart className="w-3.5 h-3.5" /> },
  { id: 'posts',       label: 'Posts',       icon: <NotebookPen className="w-3.5 h-3.5" /> },
]

const PAGE_SIZE = 15
const COMPOSER_DRAFT_KEY = 'post-composer'

type FeedData = {
  reactions: Record<string, PostReaction[]>
  comments: Record<string, PostComment[]>
}

function group<T extends { post_id: string }>(rows: T[]) {
  const map: Record<string, T[]> = {}
  for (const r of rows) (map[r.post_id] ??= []).push(r)
  return map
}

function PostsTab() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [feed, setFeed] = useState<FeedData>({ reactions: {}, comments: {} })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Bring back an unfinished post
    const draft = loadDraft<{ content: string; visibility: 'private' | 'shared' }>(COMPOSER_DRAFT_KEY)
    if (draft?.content) {
      setContent(draft.content)
      setVisibility(draft.visibility)
      setShowComposer(true)
    }
    init()
  }, [])

  // Keep the composer text on the device until it's posted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) saveDraft(COMPOSER_DRAFT_KEY, { content, visibility })
      else clearDraft(COMPOSER_DRAFT_KEY)
    }, 400)
    return () => clearTimeout(timer)
  }, [content, visibility])

  async function init() {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { setLoading(false); return }
    setUserId(user.id)
    setUserName(user.user_metadata?.name || 'You')
    const { data: profile } = await supabase.from('profiles').select('partner_id').eq('id', user.id).maybeSingle()
    const pid: string | null = profile?.partner_id ?? null
    setPartnerId(pid)
    await loadPage(user.id, pid, 0)
  }

  // Your own posts (shared or private) plus your partner's shared posts, newest first
  async function loadPage(uid: string, pid: string | null, offset: number) {
    const supabase = createClient()
    if (offset > 0) setLoadingMore(true)
    try {
      let query = supabase
        .from('posts')
        .select(`*, profiles:author_id (name, avatar_url)`)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE) // one extra row tells us if there's more
      query = pid
        ? query.or(`author_id.eq.${uid},and(author_id.eq.${pid},visibility.eq.shared)`)
        : query.eq('author_id', uid)

      const { data, error } = await query
      if (error) throw error
      const rows = (data ?? []) as PostWithProfile[]
      const page = rows.slice(0, PAGE_SIZE)
      setHasMore(rows.length > PAGE_SIZE)

      // Likes and comments for the whole page in two queries
      const ids = page.map(p => p.id)
      const [{ data: reactions }, { data: comments }] = ids.length
        ? await Promise.all([
            supabase.from('post_reactions').select('*').in('post_id', ids),
            supabase
              .from('post_comments')
              .select('*, profiles:author_id (name, avatar_url)')
              .in('post_id', ids)
              .order('created_at', { ascending: true }),
          ])
        : [{ data: [] }, { data: [] }]

      const nextReactions = group((reactions ?? []) as PostReaction[])
      const nextComments = group((comments ?? []) as PostComment[])
      setFeed(prev => offset === 0
        ? { reactions: nextReactions, comments: nextComments }
        : { reactions: { ...prev.reactions, ...nextReactions }, comments: { ...prev.comments, ...nextComments } })
      setPosts(prev => (offset === 0 ? page : [...prev, ...page]))
    } catch (err) {
      console.error('Failed to load posts', err)
      toast.error("Couldn't load posts. Check your connection.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function createPost() {
    if (!content.trim() || isSubmitting || !userId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(result.error || 'Failed to publish post'); return }
      setContent('')
      clearDraft(COMPOSER_DRAFT_KEY)
      setShowComposer(false)
      toast.success(visibility === 'shared' ? 'Shared with your partner' : 'Saved privately')
      await loadPage(userId, partnerId, 0)
    } catch (err) {
      console.error('Network error while posting:', err)
      toast.error("Couldn't post. Your text is kept as a draft; try again when you're online.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updatePost(id: string, updated: string) {
    const { error } = await createClient().from('posts').update({ content: updated }).eq('id', id)
    if (error) {
      toast.error(error.message || "Couldn't save the post")
      return false
    }
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: updated } : p))
    toast.success('Post updated')
    return true
  }

  async function deletePost(id: string) {
    const { error } = await createClient().from('posts').delete().eq('id', id)
    if (error) {
      toast.error(error.message || "Couldn't delete the post")
      return false
    }
    setPosts(prev => prev.filter(p => p.id !== id))
    toast.success('Post deleted')
    return true
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
              onClick={() => { setShowComposer(false); setContent(''); clearDraft(COMPOSER_DRAFT_KEY) }}
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
          <PostCard
            key={post.id}
            post={post}
            currentUserId={userId}
            initialReactions={feed.reactions[post.id] ?? []}
            initialComments={feed.comments[post.id] ?? []}
            onUpdate={updatePost}
            onDelete={deletePost}
          />
        ))}
        {hasMore && (
          <button
            onClick={() => loadPage(userId, partnerId, posts.length)}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load older posts'}
          </button>
        )}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <NotebookPen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No posts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Share a thought with your partner, or keep one just for you.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function FeedPageContent() {
  // ?tab=prayer etc. lets notifications open a specific tab
  const requestedTab = useSearchParams().get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.id === requestedTab) ? (requestedTab as Tab) : 'meditations'
  )

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