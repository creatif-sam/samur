'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, HandHeart, BookOpen, NotebookPen } from 'lucide-react'
import PostsTab from '@/components/posts/PostsTab'
import { InfoTip } from '@/components/ui/info-tip'
import MeditationsTab from '@/components/meditations/MeditationsTab'
import PrayerTab from '@/components/prayer/PrayerTab'

type Tab = 'meditations' | 'prayer' | 'posts'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'meditations', label: 'Meditations', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'prayer',      label: 'Prayer',      icon: <HandHeart className="w-3.5 h-3.5" /> },
  { id: 'posts',       label: 'Posts',       icon: <NotebookPen className="w-3.5 h-3.5" /> },
]

// What the ⓘ says for each tab: short and plain
const TAB_HELP: Record<Tab, { title: string; text: string }> = {
  meditations: {
    title: 'Meditations',
    text: 'Write down what God is showing you. Do it daily to grow your streak. Your memory verse and your partner’s meditations show up here too.',
  },
  prayer: {
    title: 'Prayer',
    text: 'Start the timer and pray. Every finished session is saved to the calendar. Switch to Graph to watch your minutes climb, and set a daily target for the month.',
  },
  posts: {
    title: 'Posts',
    text: 'Share a prayer request, thanks or something God showed you, with your partner or just for yourself. Tap “I prayed” on a request to stand with them.',
  },
}

function FeedPageContent() {
  // ?tab=prayer etc. lets notifications open a specific tab
  const requestedTab = useSearchParams().get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.id === requestedTab) ? (requestedTab as Tab) : 'meditations'
  )

  // Follow ?tab= when a link changes it while the Feed is already open
  useEffect(() => {
    if (TABS.some(t => t.id === requestedTab)) setActiveTab(requestedTab as Tab)
  }, [requestedTab])

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Feed</h1>
        {/* key resets the bubble when you switch tabs */}
        <InfoTip key={activeTab} title={TAB_HELP[activeTab].title} label={`About ${TAB_HELP[activeTab].title}`}>
          {TAB_HELP[activeTab].text}
        </InfoTip>
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