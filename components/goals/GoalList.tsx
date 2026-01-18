'use client'

import { Goal } from '@/lib/types'
import { GoalActions } from './GoalActions'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function GoalList({
  title,
  goals,
  onUpdated,
  onDeleted,
}: {
  title?: string
  goals: Goal[]
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
}) {
  if (!goals.length) return null

  const completed = goals.filter((g) => g.status === 'done').length
  const inProgress = goals.length - completed

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground">
            {completed} completed · {inProgress} in progress
          </span>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ))}
      </div>
    </div>
  )
}

function GoalCard({
  goal,
  onUpdated,
  onDeleted,
}: {
  goal: Goal
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const [status, setStatus] = useState(goal.status)
  const [progress, setProgress] = useState(goal.progress)

  const overdue =
    goal.due_date &&
    goal.status !== 'done' &&
    new Date(goal.due_date) < new Date(new Date().toDateString())

  const statusProgress: Record<Goal['status'], number> = {
    to_do: 0,
    doing: 49,
    blocked: 75,
    done: 100,
  }

  async function updateStatus(newStatus: Goal['status']) {
    setStatus(newStatus)
    setProgress(statusProgress[newStatus])

    const { data } = await supabase
      .from('goals')
      .update({
        status: newStatus,
        progress: statusProgress[newStatus],
      })
      .eq('id', goal.id)
      .select()
      .single()

    if (data) {
      onUpdated(data)
    }
  }

  return (
    <Card className={overdue ? 'border-red-500 bg-red-50/20' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {goal.title}
          </CardTitle>
          <GoalActions
            goal={goal}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </div>

        <p
          className={`text-xs ${
            overdue
              ? 'text-red-600 font-semibold'
              : 'text-muted-foreground'
          }`}
        >
          Deadline {new Date(goal.due_date!).toLocaleDateString()}
          {overdue && ' overdue'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <Progress value={progress} className="h-2" />

        <Select
          value={status}
          onValueChange={(v) =>
            updateStatus(v as Goal['status'])
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="to_do">To Do</SelectItem>
            <SelectItem value="doing">Doing</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
