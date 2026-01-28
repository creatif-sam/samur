'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Menu, Calendar as CalendarIcon, Smile, Check } from 'lucide-react'

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

const moodThemes: Record<string, { bg: string; text: string; accent: string }> = {
  '😊': { bg: 'bg-yellow-50/50', text: 'text-yellow-800', accent: 'bg-yellow-400' },
  '🤩': { bg: 'bg-orange-50/50', text: 'text-orange-800', accent: 'bg-orange-400' },
  '😐': { bg: 'bg-slate-50/50', text: 'text-slate-800', accent: 'bg-slate-400' },
  '😔': { bg: 'bg-blue-50/50', text: 'text-blue-800', accent: 'bg-blue-400' },
  '😴': { bg: 'bg-indigo-50/50', text: 'text-indigo-800', accent: 'bg-indigo-400' },
  '😡': { bg: 'bg-red-50/50', text: 'text-red-800', accent: 'bg-red-400' },
  'default': { bg: 'bg-white', text: 'text-slate-900', accent: 'bg-blue-600' }
}

const moods = [
  { emoji: '😊', label: 'Great' },
  { emoji: '🤩', label: 'Inspired' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Productive' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😡', label: 'Stressed' },
]

export default function DailyPlanner() {
  const supabase = createClient()

  // State
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [morning, setMorning] = useState('')
  const [reflection, setReflection] = useState('')
  const [mood, setMood] = useState('')
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [taskModalHour, setTaskModalHour] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null)
  const [goalsMap, setGoalsMap] = useState<Record<string, string>>({})

  const dateKey = selectedDate.toISOString().split('T')[0]
  const theme = moodThemes[mood] || moodThemes['default']

  // Helpers
  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  function shouldRepeatOnDate(task: PlannerTask, date: Date) {
    if (!task.recurring) return false
    if (task.recurring.until && date > new Date(task.recurring.until)) return false
    if (task.recurring.unit === 'day') return true
    if (task.recurring.unit === 'week') return task.recurring.daysOfWeek.includes(date.getDay())
    return false
  }

  function materializeRecurringTask(task: PlannerTask): PlannerTask {
    return { ...task, id: crypto.randomUUID(), completed: false, recurring: undefined }
  }

  // Load Data
  useEffect(() => { loadDay() }, [dateKey])
  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data: goals } = await supabase.from('goals').select('id,title').eq('owner_id', auth.user.id)
    if (goals) {
      const map: Record<string, string> = {}
      goals.forEach((g) => { map[g.id] = g.title })
      setGoalsMap(map)
    }
  }

  async function loadDay() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data: today } = await supabase
      .from('planner_days')
      .select('tasks, morning, reflection, mood')
      .eq('day', dateKey)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    const { data: history } = await supabase
      .from('planner_days')
      .select('tasks')
      .eq('user_id', auth.user.id)
      .lt('day', dateKey)

    const baseTasks: PlannerTask[] = Array.isArray(today?.tasks) ? today.tasks : []
    const recurringTasks: PlannerTask[] = []

    if (Array.isArray(history)) {
      for (const row of history) {
        if (!Array.isArray(row.tasks)) continue
        for (const task of row.tasks) {
          if (shouldRepeatOnDate(task, selectedDate) && !baseTasks.some(t => t.text === task.text && t.start === task.start)) {
            recurringTasks.push(materializeRecurringTask(task))
          }
        }
      }
    }

    setTasks([...baseTasks, ...recurringTasks])
    setMorning(today?.morning ?? '')
    setReflection(today?.reflection ?? '')
    setMood(today?.mood ?? '')
  }

  async function saveDay(updatedTasks = tasks, updatedMorning = morning, updatedReflection = reflection, updatedMood = mood) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    await supabase.from('planner_days').upsert({
      day: dateKey, 
      user_id: auth.user.id, 
      tasks: updatedTasks,
      morning: updatedMorning, 
      reflection: updatedReflection, 
      mood: updatedMood,
      visibility: 'private',
    }, { onConflict: 'day,user_id' })
  }

  function toggleComplete(taskId: string) {
    const updated = tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t)
    setTasks(updated)
    saveDay(updated, morning, reflection, mood)
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 ${theme.bg} text-black font-sans pb-32`}>
      {/* 1. Header & Navigation */}
      <header className={`sticky top-0 transition-colors duration-700 z-30 px-6 pt-12 pb-4 ${theme.bg} backdrop-blur-md`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className={`text-3xl font-light uppercase tracking-[0.2em] opacity-50 ${theme.text}`}>
              {selectedDate.toLocaleString('default', { month: 'short' })}
            </h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold tracking-tighter ${theme.text}`}>
                {selectedDate.getDate()}
              </span>
              <span className={`text-lg font-semibold uppercase opacity-50 ${theme.text}`}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          </div>
          <div className="flex gap-4 pb-1">
            <Search className={`w-6 h-6 ${theme.text}`} />
            <div className="relative">
              <CalendarIcon className={`w-6 h-6 ${theme.text}`} />
              <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5 ${theme.text}`}>
                {selectedDate.getDate()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Calendar Selection */}
      <div className="px-4 py-2 mt-4">
        <TopCalendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="mt-8 px-6">
        {/* Date Header & Mood Picker */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Today's Date</span>
            <div className="text-xl font-bold">
              {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${mood ? 'bg-white' : 'bg-slate-100'}`}
            >
              {mood ? <span className="text-2xl">{mood}</span> : <Smile className="w-6 h-6 text-slate-400" />}
            </button>

            {showMoodPicker && (
              <div className="absolute right-0 mt-3 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-slate-100 rounded-[28px] p-2 flex gap-2 z-50 animate-in fade-in zoom-in duration-200">
                {moods.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => {
                      setMood(m.emoji);
                      setShowMoodPicker(false);
                      saveDay(tasks, morning, reflection, m.emoji);
                    }}
                    className="w-11 h-11 hover:bg-slate-50 rounded-full flex items-center justify-center text-xl active:scale-90 transition-transform"
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Summary & Export */}
        <div className="space-y-3 mb-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-[28px] p-6 border border-white/50 shadow-sm">
            <DaySummary tasks={tasks} />
          </div>
          <div className="flex justify-start px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
          </div>
        </div>

        {/* 4. Morning Intention */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className={`w-1 h-3 rounded-full ${theme.accent}`} />
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Morning Intention</label>
          </div>
          <textarea
            value={morning}
            placeholder="Focus of the day..."
            onChange={(e) => { setMorning(e.target.value); saveDay(tasks, e.target.value, reflection, mood); }}
            className="w-full bg-white/50 border-none rounded-[24px] p-5 text-[16px] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 resize-none min-h-[90px]"
          />
        </div>

        {/* 5. The Timeline */}
        <div className="space-y-1 relative mb-10">
          {tasks
            .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
            .map((task) => (
              <div 
                key={task.id} 
                onClick={() => setEditingTask(task)}
                className="flex items-center gap-4 p-4 rounded-[24px] active:bg-white/40 transition-all active:scale-[0.98] group"
              >
                <div className="w-14 text-sm font-bold text-slate-900 tabular-nums">{task.start}</div>
                <div className="flex-1 flex items-center gap-3">
                  <div className={`w-1.5 h-10 rounded-full transition-colors duration-700 ${task.completed ? 'bg-slate-200' : theme.accent}`} />
                  <div>
                    <h3 className={`text-[17px] font-semibold leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {task.text}
                    </h3>
                    <p className="text-[13px] text-slate-400 font-medium mt-1">
                      {task.start} — {task.end} {task.goal_id && `• ${goalsMap[task.goal_id]}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-blue-500 border-blue-500' : 'border-slate-200 group-hover:border-slate-300'}`}
                >
                  {task.completed && <Check className="text-white w-4 h-4 stroke-[3]" />}
                </button>
              </div>
            ))}
        </div>

        {/* 6. Action Pill */}
        <button 
          onClick={() => setTaskModalHour(new Date().getHours())}
          className="w-full bg-slate-900/5 text-slate-500 py-5 px-8 rounded-[28px] text-left text-[15px] font-semibold flex justify-between items-center active:bg-slate-900/10 transition-colors"
        >
          Add event on {selectedDate.toLocaleString('default', { month: 'short', day: 'numeric' })}
          <Plus className="w-5 h-5 opacity-40" />
        </button>

        {/* 7. Evening Reflection */}
        <div className="mt-14 pb-20">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="w-1 h-3 bg-purple-500 rounded-full" />
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Evening Reflection</label>
          </div>
          <textarea
            value={reflection}
            placeholder="How did you finish your day?"
            onChange={(e) => { setReflection(e.target.value); saveDay(tasks, morning, e.target.value, mood); }}
            className="w-full bg-purple-50/30 border-none rounded-[24px] p-5 text-[16px] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-400 resize-none min-h-[120px]"
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setTaskModalHour(new Date().getHours())}
        className="fixed bottom-[100px] right-6 w-16 h-16 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-slate-50 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus className="w-9 h-9 text-slate-800" strokeWidth={1.5} />
      </button>

      {/* Modals */}
      {(taskModalHour !== null || editingTask) && (
        <TaskModal
          hour={editingTask ? parseInt(editingTask.start.split(':')[0]) : taskModalHour!}
          existingTask={editingTask}
          onClose={() => { setTaskModalHour(null); setEditingTask(null); }}
          onSave={(task) => {
            const updated = editingTask ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task]
            setTasks(updated)
            saveDay(updated, morning, reflection, mood)
            setTaskModalHour(null)
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}