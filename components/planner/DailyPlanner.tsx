'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import {
  PlusCircle,
  CheckCircle,
  CheckCircle2,
  Pencil
} from 'lucide-react'

import { TaskModal } from './tasks/TaskModal'
import TopCalendar from './TopCalendar'
import DaySummary from './DailySummary'
import FreeTimeExportButton from './FreeTimeExportButton'

export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
  goal_id?: string
  recurring?: {
    interval: number
    unit: 'day' | 'week'
    daysOfWeek: number[]
    until?: string
  }
}

const HOURS_START = 5
const HOURS_END = 23

export default function DailyPlanner() {
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [morning, setMorning] = useState('')
  const [reflection, setReflection] = useState('')
  const [taskModalHour, setTaskModalHour] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null)
  const [goalsMap, setGoalsMap] = useState<Record<string, string>>({})

  const dateKey = selectedDate.toISOString().split('T')[0]

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  function shouldRepeatOnDate(task: PlannerTask, date: Date) {
    if (!task.recurring) return false

    if (task.recurring.until) {
      const until = new Date(task.recurring.until)
      if (date > until) return false
    }

    if (task.recurring.unit === 'day') return true

    if (task.recurring.unit === 'week') {
      return task.recurring.daysOfWeek.includes(date.getDay())
    }

    return false
  }

  function materializeRecurringTask(task: PlannerTask): PlannerTask {
    return {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
      recurring: undefined,
    }
  }

  useEffect(() => {
    loadDay()
  }, [dateKey])

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data: goals } = await supabase
      .from('goals')
      .select('id,title')
      .eq('owner_id', auth.user.id)

    if (goals) {
      const map: Record<string, string> = {}
      goals.forEach((g) => {
        map[g.id] = g.title
      })
      setGoalsMap(map)
    }
  }

  async function loadDay() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data: today } = await supabase
      .from('planner_days')
      .select('tasks, morning, reflection')
      .eq('day', dateKey)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    const { data: history } = await supabase
      .from('planner_days')
      .select('tasks')
      .eq('user_id', auth.user.id)
      .lt('day', dateKey)

    const baseTasks: PlannerTask[] = Array.isArray(today?.tasks)
      ? today.tasks
      : []

    const recurringTasks: PlannerTask[] = []

    if (Array.isArray(history)) {
      for (const row of history) {
        if (!Array.isArray(row.tasks)) continue

        for (const task of row.tasks) {
          if (
            shouldRepeatOnDate(task, selectedDate) &&
            !baseTasks.some(
              (t) =>
                t.text === task.text &&
                t.start === task.start &&
                t.end === task.end
            )
          ) {
            recurringTasks.push(materializeRecurringTask(task))
          }
        }
      }
    }

    setTasks([...baseTasks, ...recurringTasks])
    setMorning(today?.morning ?? '')
    setReflection(today?.reflection ?? '')
  }

  async function saveDay(
    updatedTasks = tasks,
    updatedMorning = morning,
    updatedReflection = reflection
  ) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    await supabase.from('planner_days').upsert(
      {
        day: dateKey,
        user_id: auth.user.id,
        tasks: updatedTasks,
        morning: updatedMorning,
        reflection: updatedReflection,
        visibility: 'private',
      },
      { onConflict: 'day,user_id' }
    )
  }

  function toggleComplete(taskId: string) {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )
    setTasks(updated)
    saveDay(updated, morning, reflection)
  }

  return (
    <div className="p-4 space-y-5 max-w-xl mx-auto">
      <div className="space-y-4">
        <TopCalendar selectedDate={selectedDate} onChange={setSelectedDate} />
        <DaySummary tasks={tasks} />
      </div>

      <FreeTimeExportButton tasks={tasks} date={selectedDate} />

      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">Morning Intention</div>
        <textarea
          value={morning}
          onChange={(e) => {
            setMorning(e.target.value)
            saveDay(tasks, e.target.value, reflection)
          }}
          rows={2}
          className="w-full border rounded-lg p-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        {Array.from(
          { length: HOURS_END - HOURS_START },
          (_, i) => i + HOURS_START
        ).map((h) => (
          <div key={h} className="border rounded-lg p-2 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>{h}:00</span>
              <button
                onClick={() => setTaskModalHour(h)}
                className="flex items-center justify-center rounded-full border h-7 w-7 hover:bg-muted transition"
              >
                <PlusCircle size={18} className="opacity-70" />
              </button>
            </div>

            {tasks
              .filter(
                (t) =>
                  parseMinutes(t.start) <= h * 60 &&
                  parseMinutes(t.end) > h * 60
              )
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg px-3 py-2 text-sm flex justify-between items-start gap-3"
                >
                  <div>
                    <div className="font-medium">{t.text}</div>

                    {t.goal_id && goalsMap[t.goal_id] ? (
                      <div className="text-xs text-violet-200">
                        🎯 Goal: {goalsMap[t.goal_id]}
                      </div>
                    ) : (
                      <div className="text-xs opacity-40">No goal linked</div>
                    )}

                    <div className="text-xs opacity-80">
                      {t.start} to {t.end}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditingTask(t)}>
                      <Pencil size={16} className="opacity-80" />
                    </button>

                    <button onClick={() => toggleComplete(t.id)}>
                      {t.completed ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <CheckCircle size={20} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">Evening Reflection</div>
        <textarea
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value)
            saveDay(tasks, morning, e.target.value)
          }}
          rows={3}
          className="w-full border rounded-lg p-2 text-sm"
        />
      </div>

      {(taskModalHour !== null || editingTask) && (
        <TaskModal
          hour={
            editingTask
              ? parseInt(editingTask.start.split(':')[0])
              : taskModalHour!
          }
          existingTask={editingTask}
          onClose={() => {
            setTaskModalHour(null)
            setEditingTask(null)
          }}
          onSave={(task) => {
            const updated = editingTask
              ? tasks.map((t) => (t.id === task.id ? task : t))
              : [...tasks, task]

            setTasks(updated)
            saveDay(updated, morning, reflection)
            setTaskModalHour(null)
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
