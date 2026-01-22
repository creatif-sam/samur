'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import { ArrowLeft, Pencil, Share2 } from 'lucide-react'

interface Meditation {
  id: string
  title: string
  scripture: string
  lesson: string
  application: string
  prayer: string
  visibility: 'private' | 'shared'
  created_at: string
}

export default function MeditationViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const [meditation, setMeditation] = useState<Meditation | null>(null)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)

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
      console.error(error)
      return
    }

    setMeditation(data)
  }

  async function shareToFeed() {
    if (!meditation) return
    setSharing(true)

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSharing(false)
      return
    }

    let partnerId = null
    if (meditation.visibility === 'shared') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', auth.user.id)
        .single()

      partnerId = profile?.partner_id
    }

    await supabase.from('posts').insert({
      author_id: auth.user.id,
      partner_id: partnerId,
      visibility: meditation.visibility,
      meditation_id: meditation.id,
      content: `Meditation: ${meditation.title}`,
    })

    setSharing(false)
  }

  if (!meditation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
        Loading meditation
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/protected/meditations')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={shareToFeed}
            disabled={sharing}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </header>

      {/* Composer */}
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

      {/* Title */}
      <section className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-violet-700">
          {meditation.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date(meditation.created_at).toLocaleDateString()}
        </p>
      </section>

      {/* Scripture */}
      <section className="rounded-xl border bg-violet-50 px-6 py-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">
          Scripture
        </h2>
        <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
          {meditation.scripture}
        </p>
      </section>

      {/* Lesson */}
      <section className="rounded-xl border bg-background px-6 py-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lesson or Revelation
        </h2>
        <p className="whitespace-pre-line leading-relaxed">
          {meditation.lesson}
        </p>
      </section>

      {/* Application */}
      <section className="rounded-xl border bg-background px-6 py-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Application
        </h2>
        <p className="whitespace-pre-line leading-relaxed">
          {meditation.application}
        </p>
      </section>

      {/* Prayer */}
      <section className="rounded-xl border bg-muted px-6 py-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prayer
        </h2>
        <p className="italic whitespace-pre-line leading-relaxed">
          {meditation.prayer}
        </p>
      </section>
    </div>
  )
}
