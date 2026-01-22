'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import FeedSwitch from '@/components/feed/FeedSwitch'

interface Meditation {
  id: string
  title: string
  scripture: string
  visibility: 'private' | 'shared'
  created_at: string
}

export default function MeditationsPage() {
  const [meditations, setMeditations] = useState<Meditation[]>([])

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Meditations</h1>
        <FeedSwitch />
      </div>

      {meditations.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4 space-y-1">
            <p className="font-semibold">{m.title}</p>
            <p className="text-sm text-muted-foreground">
              {m.scripture}
            </p>
            <p className="text-xs">{m.visibility}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
