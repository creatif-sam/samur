'use client'

import { useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'
import { TaskBasics } from './TaskBasics'
import { TaskRecurrence } from './TaskRecurrence'
import { Modal } from './Modal'

export function TaskModal({
  hour,
  onClose,
  onSave,
}: {
  hour: number
  onClose: () => void
  onSave: (t: PlannerTask) => void
}) {
  const [text, setText] = useState('')
  const [end, setEnd] = useState(hour + 1)
  const [recurring, setRecurring] =
    useState<PlannerTask['recurring'] | null>(null)

  return (
    <Modal onClose={onClose}>
      <h3 className="font-semibold mb-3">New Task</h3>

      <TaskBasics
        text={text}
        end={end}
        hour={hour}
        onTextChange={setText}
        onEndChange={setEnd}
      />

      <TaskRecurrence
        value={recurring}
        onChange={setRecurring}
      />

      <button
        onClick={() =>
          onSave({
            id: crypto.randomUUID(),
            text,
            start: `${hour}:00`,
            end: `${end}:00`,
            completed: false,
            recurring: recurring ?? undefined,
          })
        }
        className="mt-4 w-full bg-violet-600 text-white rounded-lg py-2"
      >
        Save
      </button>
    </Modal>
  )
}
