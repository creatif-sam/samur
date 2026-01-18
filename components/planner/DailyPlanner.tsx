'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { TaskModal } from './tasks/TaskModal'

export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
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
  const [calendarOpen, setCalendarOpen] = useState(false)

  const dateKey = selectedDate.toISOString().split('T')[0]

  useEffect(() => {
    loadDay()
  }, [dateKey])

  async function loadDay() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data } = await supabase
      .from('planner_days')
      .select('tasks, morning, reflection')
      .eq('day', dateKey)
      .maybeSingle()

    setTasks(Array.isArray(data?.tasks) ? data.tasks : [])
    setMorning(data?.morning ?? '')
    setReflection(data?.reflection ?? '')
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
        tasks: updatedTasks,
        morning: updatedMorning,
        reflection: updatedReflection,
        visibility: 'private',
      },
      { onConflict: 'day' }
    )
  }

  function navigate(dir: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    setSelectedDate(d)
  }

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function exportFreeTime() {
    const busy = tasks
      .map((t) => ({
        start: parseMinutes(t.start),
        end: parseMinutes(t.end),
      }))
      .sort((a, b) => a.start - b.start)

    let cursor = HOURS_START * 60
    const end = HOURS_END * 60
    const free: { start: number; end: number }[] = []

    for (const b of busy) {
      if (b.start > cursor) {
        free.push({ start: cursor, end: b.start })
      }
      cursor = Math.max(cursor, b.end)
    }

    if (cursor < end) {
      free.push({ start: cursor, end })
    }

    const text =
      `Free time for ${selectedDate.toDateString()}\n\n` +
      free.map((f) => `${formatMinutes(f.start)} – ${formatMinutes(f.end)}`).join('\n')

    navigator.clipboard.writeText(text)
    alert('Free time copied')
  }

  return (
    <div className="p-4 space-y-5 max-w-xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>

        <div className="relative">
          <button
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium"
          >
            <Calendar size={14} />
            {selectedDate.toDateString()}
          </button>

          {calendarOpen && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-background border rounded-xl p-2 shadow-lg z-20">
              <input
                type="date"
                value={dateKey}
                onChange={(e) => {
                  setSelectedDate(new Date(e.target.value))
                  setCalendarOpen(false)
                }}
                className="border rounded-md px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>

        <button onClick={() => navigate(1)}>
          <ChevronRight />
        </button>
      </div>

      {/* PRIMARY ACTION */}
      <button
        onClick={exportFreeTime}
        className="w-full rounded-xl bg-black text-white py-2 text-sm font-medium"
      >
        Export Free Time
      </button>

      {/* MORNING */}
      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">
          Morning Intention
        </div>
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

      {/* HOURS */}
      <div className="space-y-2">
        {Array.from(
          { length: HOURS_END - HOURS_START },
          (_, i) => i + HOURS_START
        ).map((h) => (
          <div key={h} className="border rounded-lg p-2 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>{h}:00</span>
              <button onClick={() => setTaskModalHour(h)}>
                <Plus size={16} />
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
                  className="rounded-lg px-3 py-2 text-sm bg-violet-600 text-white"
                >
                  {t.text}
                  <div className="text-xs opacity-80">
                    {t.start} to {t.end}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* EVENING */}
      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">
          Evening Reflection
        </div>
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

      {taskModalHour !== null && (
        <TaskModal
          hour={taskModalHour}
          onClose={() => setTaskModalHour(null)}
          onSave={(task) => {
            const updated = [...tasks, task]
            setTasks(updated)
            saveDay(updated, morning, reflection)
            setTaskModalHour(null)
          }}
        />
      )}
    </div>
  )
}
