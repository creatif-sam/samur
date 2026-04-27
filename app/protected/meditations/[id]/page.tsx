'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import {
  ArrowLeft,
  Pencil,
  Share2,
  Image as ImageIcon,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Heart,
  Loader2,
  Globe
} from 'lucide-react'
import { toast } from 'sonner' // Assuming you use Sonner for notifications

interface Meditation {
  id: string
  title: string
  scripture: string
  lesson: string
  application: string
  prayer: string
  visibility: 'private' | 'shared'
  period: 'morning' | 'evening'
  created_at: string
}

export default function MeditationViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const pageRef = useRef<HTMLDivElement>(null)

  const [meditation, setMeditation] = useState<Meditation | null>(null)
  const [editing, setEditing] = useState(false)
  const [sharingToFeed, setSharingToFeed] = useState(false)

  const formattedDate = meditation
    ? new Date(meditation.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
    : ''
  const formattedTime = meditation
    ? new Date(meditation.created_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''
  const periodLabel = meditation
    ? meditation.period === 'morning'
      ? 'Morning'
      : 'Evening'
    : ''

  useEffect(() => {
    loadMeditation()
  }, [id])

  async function loadMeditation() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meditations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast.error("Could not load meditation")
      return
    }
    setMeditation(data)
  }

  // --- HTML FIX: Renders tags correctly or falls back to plain text ---
  const RenderContent = ({ html }: { html: string }) => {
    // If text contains HTML tags, render them safely
    if (/<[a-z][\s\S]*>/i.test(html)) {
      return (
        <div 
          className="prose dark:prose-invert max-w-none text-foreground/90 font-serif" 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      )
    }
    // Otherwise, handle as plain text with line breaks
    return <p className="whitespace-pre-line pl-1">{html}</p>
  }

  // --- SHARE LOGIC 1: Native Web Share (WhatsApp, Instagram, etc.) ---
  async function handleNativeShare() {
    if (!meditation) return
    
    const shareData = {
      title: meditation.title,
      text: `Meditation: ${meditation.title}\n\nScripture: ${meditation.scripture}`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Link copied to clipboard")
      }
    } catch (err) {
      console.log("Share cancelled or failed", err)
    }
  }

  // --- SHARE LOGIC 2: Internal Community Feed ---
  async function postToInternalFeed() {
    if (!meditation) return
    setSharingToFeed(true)

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { error } = await supabase.from('posts').insert({
      author_id: auth.user.id,
      visibility: meditation.visibility,
      meditation_id: meditation.id,
      content: `shared a meditation: ${meditation.title}`,
    })

    if (error) {
      toast.error("Failed to post to feed")
    } else {
      toast.success("Shared with the community!")
    }
    setSharingToFeed(false)
  }

  if (!meditation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <p className="text-sm font-medium italic">Opening the scrolls...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 pb-20">
      {/* Header - Sticky with glass effect */}
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/protected/meditations')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>

            <Button size="sm" variant="ghost" className="rounded-full text-violet-600 dark:text-violet-400" onClick={handleNativeShare}>
              <Share2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button 
              size="sm" 
              variant="ghost" 
              className="rounded-full" 
              onClick={postToInternalFeed} 
              disabled={sharingToFeed}
            >
              {sharingToFeed ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 sm:mr-1" />}
              <span className="hidden sm:inline">Feed</span>
            </Button>

            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => window.print()}>
              <ImageIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Meditation Content - "Book Page" Aesthetic */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 print:p-0">
        <article 
          ref={pageRef}
          className="bg-card dark:bg-zinc-950 border border-border shadow-2xl dark:shadow-none rounded-[32px] px-8 py-12 sm:px-16 sm:py-20 transition-all"
        >
          <div className="space-y-12 font-serif text-[18px] leading-relaxed">
            
            {/* Title & Date */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black tracking-tighter text-violet-600 dark:text-violet-400 font-sans uppercase italic">
                {meditation.title}
              </h1>
              <div className="flex items-center justify-center gap-3">
                <span className="h-[1px] w-10 bg-violet-200 dark:bg-violet-900" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  {formattedDate}
                </p>
                <span className="h-[1px] w-10 bg-violet-200 dark:bg-violet-900" />
              </div>
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                    meditation.period === 'morning'
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  {formattedTime} • {periodLabel}
                </span>
              </div>
            </div>

            {/* Content Sections */}
            {[
              { id: 'scripture', label: 'Scripture', icon: BookOpen, content: meditation.scripture, italic: true },
              { id: 'lesson', label: 'Lesson', icon: Lightbulb, content: meditation.lesson },
              { id: 'application', label: 'Application', icon: CheckCircle, content: meditation.application },
              { id: 'prayer', label: 'Prayer', icon: Heart, content: meditation.prayer, italic: true },
            ].map((section) => (
              <section key={section.id} className="space-y-4 group">
                <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 px-4 py-1.5 rounded-full transition-all group-hover:scale-105">
                  <section.icon className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-800 dark:text-violet-300">
                    {section.label}
                  </h2>
                </div>
                <div className={`${section.italic ? 'italic text-foreground/80' : 'text-foreground/90'} transition-opacity`}>
                  <RenderContent html={section.content} />
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>

      {/* Editing Modal */}
      {editing && (
        <MeditationComposer
          meditation={meditation}
          onClose={() => setEditing(false)}
          onCreated={() => {
            setEditing(false)
            loadMeditation()
          }}
        />
      )}
    </div>
  )
}