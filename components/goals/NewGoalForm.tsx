'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
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

export function NewGoalForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (goal: Goal) => void
}) {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [visibility, setVisibility] =
    useState<'private' | 'shared'>('private')
  const [goalType, setGoalType] =
    useState<'single' | 'combined'>('single')

  const valid = title.trim() && dueDate

  async function create() {
    if (!valid) return

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data, error } = await supabase
      .from('goals')
      .insert({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        visibility,
        goal_type: goalType,
        owner_id: auth.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create goal error', error)
      return
    }

    onCreated(data)
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Input
          placeholder="Goal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex gap-2">
          <Select
            value={goalType}
            onValueChange={(v) =>
              setGoalType(v as 'single' | 'combined')
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Personal</SelectItem>
              <SelectItem value="combined">Shared</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={visibility}
            onValueChange={(v) =>
              setVisibility(v as 'private' | 'shared')
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={create}>
            Create Goal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
