'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookMarked, Loader2, Lock, NotebookPen, RefreshCw, Search, Send, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PostComment, PostReaction } from '@/lib/types'
import { clearDraft, loadDraft, saveDraft } from '@/lib/offline'
import { POST_KINDS, composePost, dayLabel, kindInfo, parsePost, type PostKind } from '@/lib/posts'
import DictationButton, { appendDictation } from '@/components/DictationButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import PostCard, { type PostWithProfile } from '@/components/posts/PostCard'
import DailyJournalModal from '@/components/posts/DailyJournalModal'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15
const COMPOSER_DRAFT_KEY = 'post-composer'
const lastSeenKey = (uid: string) => `posts-last-seen-${uid}`

type FeedData = {
  reactions: Record<string, PostReaction[]>
  comments: Record<string, PostComment[]>
}
type Filter = 'all' | 'partner' | 'mine' | 'private' | PostKind
type Draft = { content: string; visibility: 'private' | 'shared'; kind?: PostKind | null }

function group<T extends { post_id: string }>(rows: T[]) {
  const map: Record<string, T[]> = {}
  for (const r of rows) (map[r.post_id] ??= []).push(r)
  return map
}

export default function PostsTab() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [feed, setFeed] = useState<FeedData>({ reactions: {}, comments: {} })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<PostKind | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared')
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('')
  const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: 'You', avatar: null })
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  // Partner posts newer than this were posted since your last visit
  const [seenBefore, setSeenBefore] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // Bring back an unfinished post
    const draft = loadDraft<Draft>(COMPOSER_DRAFT_KEY)
    if (draft?.content) {
      setContent(draft.content)
      setVisibility(draft.visibility)
      setKind(draft.kind ?? null)
      setShowComposer(true)
    }
    init()
  }, [])

  // Keep the composer text on the device until it's posted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) saveDraft(COMPOSER_DRAFT_KEY, { content, visibility, kind })
      else clearDraft(COMPOSER_DRAFT_KEY)
    }, 400)
    return () => clearTimeout(timer)
  }, [content, visibility, kind])

  async function init() {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { setLoading(false); return }
    setUserId(user.id)

    try {
      setSeenBefore(localStorage.getItem(lastSeenKey(user.id)))
      localStorage.setItem(lastSeenKey(user.id), new Date().toISOString())
    } catch {}

    const { data: profile } = await supabase.from('profiles').select('name, avatar_url, partner_id').eq('id', user.id).maybeSingle()
    setMe({ name: profile?.name || user.user_metadata?.name || 'You', avatar: profile?.avatar_url ?? null })
    const pid: string | null = profile?.partner_id ?? null
    setPartnerId(pid)
    if (pid) {
      const { data: partner } = await supabase.from('profiles').select('name').eq('id', pid).maybeSingle()
      setPartnerName(partner?.name?.split(' ')[0] || 'Partner')
    }
    await loadPage(user.id, pid, 0)
  }

  // Your own posts (shared or private) plus your partner's shared posts, newest first
  async function loadPage(uid: string, pid: string | null, offset: number) {
    const supabase = createClient()
    if (offset > 0) setLoadingMore(true)
    try {
      let q = supabase
        .from('posts')
        .select(`*, profiles:author_id (name, avatar_url)`)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE) // one extra row tells us if there's more
      q = pid
        ? q.or(`author_id.eq.${uid},and(author_id.eq.${pid},visibility.eq.shared)`)
        : q.eq('author_id', uid)

      const { data, error } = await q
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

  async function refresh() {
    if (!userId || refreshing) return
    setRefreshing(true)
    await loadPage(userId, partnerId, 0)
    setRefreshing(false)
  }

  function openComposer(nextKind: PostKind | null = kind) {
    setKind(nextKind)
    setShowComposer(true)
    // Focus after the composer renders
    setTimeout(() => composerRef.current?.focus(), 50)
  }

  function closeComposer() {
    setShowComposer(false)
    setContent('')
    setKind(null)
    clearDraft(COMPOSER_DRAFT_KEY)
  }

  async function createPost() {
    if (!content.trim() || isSubmitting || !userId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composePost(kind, content), visibility }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(result.error || 'Failed to publish post'); return }
      toast.success(visibility === 'shared' ? `Shared with ${partnerName || 'your partner'}` : 'Saved privately')
      closeComposer()
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

  const isNew = (p: PostWithProfile) => !!seenBefore && p.author_id !== userId && p.created_at > seenBefore
  const newCount = posts.filter(isNew).length

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length, partner: 0, mine: 0, private: 0 }
    for (const p of posts) {
      if (p.author_id === userId) c.mine++
      else c.partner++
      if (p.visibility === 'private') c.private++
      const k = parsePost(p.content).kind
      if (k) c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [posts, userId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter(p => {
      if (filter === 'partner' && p.author_id === userId) return false
      if (filter === 'mine' && p.author_id !== userId) return false
      if (filter === 'private' && p.visibility !== 'private') return false
      if (POST_KINDS.some(k => k.id === filter) && parsePost(p.content).kind !== filter) return false
      return !q || p.content.toLowerCase().includes(q)
    })
  }, [posts, filter, query, userId])

  // Group the visible posts under day headings
  const sections = useMemo(() => {
    const out: { label: string; items: PostWithProfile[] }[] = []
    for (const p of visible) {
      const label = dayLabel(p.created_at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(p)
      else out.push({ label, items: [p] })
    }
    return out
  }, [visible])

  if (loading || !userId) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  }

  const initials = me.name.slice(0, 2).toUpperCase()
  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(partnerId ? [{ id: 'partner' as const, label: partnerName || 'Partner' }] : []),
    { id: 'mine', label: 'Mine' },
    { id: 'private', label: 'Only me' },
    ...POST_KINDS.map(k => ({ id: k.id as Filter, label: `${k.emoji} ${k.label}` })),
  ]
  const activeKind = kindInfo(kind)

  return (
    <div className="space-y-4 pb-10">
      {showJournalModal && <DailyJournalModal onClose={() => setShowJournalModal(false)} />}

      {/* ── Composer ── */}
      {!showComposer ? (
        <div className="rounded-3xl border border-border/60 bg-card p-3 shadow-sm">
          <button onClick={() => openComposer(null)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left">
            <Avatar className="h-10 w-10">
              <AvatarImage src={me.avatar ?? undefined} />
              <AvatarFallback className="bg-violet-600 text-white text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <span className="flex-1 rounded-full bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">What&apos;s on your heart?</span>
          </button>
          <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
            {POST_KINDS.map(k => (
              <button
                key={k.id}
                onClick={() => openComposer(k.id)}
                className="shrink-0 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-muted active:scale-95"
              >
                {k.emoji} {k.label}
              </button>
            ))}
            <button
              onClick={() => setShowJournalModal(true)}
              className="shrink-0 flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-95 dark:bg-violet-500/15 dark:text-violet-300"
            >
              <BookMarked className="h-3.5 w-3.5" /> Journal my day
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={me.avatar ?? undefined} />
              <AvatarFallback className="bg-violet-600 text-white text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-none">{me.name}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <button
                  onClick={() => setVisibility('shared')}
                  disabled={!partnerId}
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors disabled:opacity-40',
                    visibility === 'shared'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Users className="w-3 h-3" /> {partnerName ? `With ${partnerName}` : 'Shared'}
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
            <button onClick={closeComposer} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" disabled={isSubmitting}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Post type */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pt-1">
            {POST_KINDS.map(k => (
              <button
                key={k.id}
                onClick={() => setKind(kind === k.id ? null : k.id)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition',
                  kind === k.id ? k.pill : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                )}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>

          <Textarea
            ref={composerRef}
            autoFocus
            placeholder={activeKind?.prompt ?? 'Share a thought, prayer, or reflection…'}
            className="min-h-[120px] border-none focus-visible:ring-0 resize-none px-4 py-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/50 bg-transparent"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); createPost() } }}
            disabled={isSubmitting}
          />

          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-[11px] text-muted-foreground">
              {content.trim() ? 'Draft saved on this device' : visibility === 'shared' && partnerName ? `${partnerName} will be notified` : ''}
            </p>
            <DictationButton className="w-9 h-9 ml-auto" onText={text => setContent(c => appendDictation(c, text))} />
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
                  : <><Lock className="w-3.5 h-3.5 mr-1.5" />Save</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── New from partner ── */}
      {newCount > 0 && filter === 'all' && !query && (
        <div className="flex items-center gap-3 rounded-2xl bg-violet-600 px-4 py-3 text-white shadow-lg shadow-violet-500/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <p className="flex-1 text-sm font-semibold">
            {newCount} new post{newCount === 1 ? '' : 's'} from {partnerName || 'your partner'} since your last visit
          </p>
        </div>
      )}

      {/* ── Filters + search ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
            {chips.map(c => {
              const n = counts[c.id] ?? 0
              if (c.id !== 'all' && c.id !== filter && n === 0) return null
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
                    filter === c.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c.label} <span className="ml-0.5 tabular-nums opacity-60">{n}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery('') }}
            aria-label="Search posts"
            className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full transition', showSearch ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}
          >
            <Search className="h-4 w-4" />
          </button>
          <button onClick={refresh} aria-label="Refresh" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts"
              className="h-10 w-full rounded-2xl bg-muted/60 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Feed ── */}
      <section className="space-y-5">
        {sections.map(section => (
          <div key={section.label} className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{section.label}</p>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            {section.items.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                isNew={isNew(post)}
                partnerName={partnerName}
                highlight={query.trim()}
                initialReactions={feed.reactions[post.id] ?? []}
                initialComments={feed.comments[post.id] ?? []}
                onUpdate={updatePost}
                onDelete={deletePost}
              />
            ))}
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => loadPage(userId, partnerId, posts.length)}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : (filter !== 'all' || query) ? 'Load older posts to find more' : 'Load older posts'}
          </button>
        )}

        {visible.length === 0 && (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <NotebookPen className="w-6 h-6 text-muted-foreground" />
            </div>
            {posts.length === 0 ? (
              <>
                <p className="text-sm font-medium">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share a prayer request or something you&apos;re grateful for.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Nothing matches</p>
                <button onClick={() => { setFilter('all'); setQuery('') }} className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400">Show all posts</button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
