'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Meditation {
  id: string
  title: string
  scripture: string
  lesson: string
  application: string
  prayer: string
  visibility: 'private' | 'shared'
}

interface MeditationComposerProps {
  meditation?: Meditation
  onClose: () => void
  onCreated?: () => void
}

export default function MeditationComposer({
  meditation,
  onClose,
  onCreated,
}: MeditationComposerProps) {
  const [title, setTitle] = useState('')
  const [scripture, setScripture] = useState('')
  const [lesson, setLesson] = useState('')
  const [application, setApplication] = useState('')
  const [prayer, setPrayer] = useState('')
  const [visibility, setVisibility] =
    useState<'private' | 'shared'>('private')
  const [autoPost, setAutoPost] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (meditation) {
      setTitle(meditation.title)
      setScripture(meditation.scripture)
      setLesson(meditation.lesson)
      setApplication(meditation.application)
      setPrayer(meditation.prayer)
      setVisibility(meditation.visibility)
    }
  }, [meditation])

  async function saveMeditation() {
    if (!title || !scripture || !lesson) return
    setSaving(true)

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setSaving(false)
      return
    }

    let meditationId = meditation?.id

    if (meditation) {
      const { error } = await supabase
        .from('meditations')
        .update({
          title,
          scripture,
          lesson,
          application,
          prayer,
          visibility,
        })
        .eq('id', meditation.id)

      if (error) {
        console.error(error)
        setSaving(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('meditations')
        .insert({
          author_id: auth.user.id,
          title,
          scripture,
          lesson,
          application,
          prayer,
          visibility,
        })
        .select()
        .single()

      if (error || !data) {
        console.error(error)
        setSaving(false)
        return
      }

      meditationId = data.id
    }

    if (autoPost && meditationId) {
      let partnerId = null

      if (visibility === 'shared') {
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
        visibility,
        meditation_id: meditationId,
        content: `Meditation: ${title}`,
      })
    }

    setSaving(false)
    onCreated?.()
    onClose()
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {meditation ? 'Edit Meditation' : 'New Meditation'}
        </h2>

        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          placeholder="Scripture"
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
        />

        <Textarea
          placeholder="Lesson or Revelation"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        />

        <Textarea
          placeholder="Application"
          value={application}
          onChange={(e) => setApplication(e.target.value)}
        />

        <Textarea
          placeholder="Prayer"
          value={prayer}
          onChange={(e) => setPrayer(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <Select
            value={visibility}
            onValueChange={(v) =>
              setVisibility(v as 'private' | 'shared')
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoPost}
              onChange={() => setAutoPost(!autoPost)}
            />
            Post to feed
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveMeditation} disabled={saving}>
            {saving ? 'Saving' : 'Save Meditation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
