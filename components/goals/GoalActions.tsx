'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Pencil, Trash2 } from 'lucide-react'
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

export function GoalActions({
  goal,
  onUpdated,
  onDeleted,
}: {
  goal: Goal
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description ?? '')
  const [visibility, setVisibility] =
    useState<'private' | 'shared'>(goal.visibility)
  const [dueDate, setDueDate] = useState<string | ''>(
    goal.due_date ?? ''
  )

  async function save() {
    const { data, error } = await supabase
      .from('goals')
      .update({
        title,
        description,
        visibility,
        due_date: dueDate || null,
      })
      .eq('id', goal.id)
      .select()
      .single()

    if (error) {
      console.error('Update goal error', error)
      return
    }

    onUpdated(data)
    setOpen(false)
  }

  async function remove() {
    const confirmed = confirm('Delete this goal')
    if (!confirmed) return

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goal.id)

    if (error) {
      console.error('Delete goal error', error)
      return
    }

    onDeleted(goal.id)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground"
          title="Edit goal"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={remove}
          className="text-red-600 hover:text-red-700"
          title="Delete goal"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl p-4 w-[90%] max-w-sm space-y-3">
            <h3 className="font-semibold text-lg">Edit Goal</h3>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title"
            />

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />

            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Select
              value={visibility}
              onValueChange={(v) =>
                setVisibility(v as 'private' | 'shared')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
