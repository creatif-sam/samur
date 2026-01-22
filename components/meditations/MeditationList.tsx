'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MeditationComposer from './MeditationComposer'

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

export default function MeditationList() {
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [editing, setEditing] = useState<Meditation | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)

  useEffect(() => {
    loadMeditations()
  }, [])

  async function loadMeditations() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meditations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setMeditations(data ?? [])
  }

  async function deleteMeditation(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('meditations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      return
    }

    setMeditations((prev) => prev.filter((m) => m.id !== id))
  }

  async function shareToFeed(meditation: Meditation) {
    setSharingId(meditation.id)

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSharingId(null)
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

    const { error } = await supabase.from('posts').insert({
      author_id: auth.user.id,
      partner_id: partnerId,
      visibility: meditation.visibility,
      meditation_id: meditation.id,
      content: `Meditation: ${meditation.title}`,
    })

    if (error) {
      console.error(error)
    }

    setSharingId(null)
  }

  return (
    <div className="space-y-6">
      {editing && (
        <MeditationComposer
          meditation={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null)
            loadMeditations()
          }}
        />
      )}

      {meditations.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{m.title}</h3>
              <span className="text-xs text-muted-foreground">
                {m.visibility}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {m.scripture}
            </p>

            <div className="flex gap-2 pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(m)}
              >
                Edit
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={sharingId === m.id}
                onClick={() => shareToFeed(m)}
              >
                {sharingId === m.id ? 'Sharing' : 'Share to feed'}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMeditation(m.id)}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
