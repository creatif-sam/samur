'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Menu, Calendar as CalendarIcon, Smile } from 'lucide-react'

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

const HOURS_START = 0
const HOURS_END = 24

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
    if (task.recurring.until && date > new Date(task.recurring.until)) return false
    if (task.recurring.unit === 'day') return true
    if (task.recurring.unit === 'week') return task.recurring.daysOfWeek.includes(date.getDay())
    return false
  }

  function materializeRecurringTask(task: PlannerTask): PlannerTask {
    return { ...task, id: crypto.randomUUID(), completed: false, recurring: undefined }
  }

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
      .select('tasks, morning, reflection')
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
  }

  async function saveDay(updatedTasks = tasks, updatedMorning = morning, updatedReflection = reflection) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    await supabase.from('planner_days').upsert({
      day: dateKey, user_id: auth.user.id, tasks: updatedTasks,
      morning: updatedMorning, reflection: updatedReflection, visibility: 'private',
    }, { onConflict: 'day,user_id' })
  }

  function toggleComplete(taskId: string) {
    const updated = tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t)
    setTasks(updated)
    saveDay(updated, morning, reflection)
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-24">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3">
        <Menu className="w-6 h-6" />
        <div className="flex gap-6">
          <Search className="w-6 h-6" />
          <div className="relative">
            <CalendarIcon className="w-6 h-6" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5">28</span>
          </div>
        </div>
      </header>

      {/* Samsung Style Calendar Header */}
      <div className="px-4 py-2">
        <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-widest">Jan</h1>
        <TopCalendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="mt-8 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{selectedDate.getDate()}</span>
            <span className="text-sm font-bold uppercase text-gray-500">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
          <Smile className="w-6 h-6 text-gray-400" />
        </div>


 {/* Summary & Export Row */}
{/* Summary & Action Section */}
<div className="space-y-3 mb-8">
  {/* The Summary Card */}
  <div className="bg-[#F8F9FA] rounded-[24px] p-5 border border-slate-100/50">
    <DaySummary tasks={tasks} />
  </div>
  
  {/* The Export Action - Now Underneath */}
  <div className="flex justify-start px-1">
    <FreeTimeExportButton tasks={tasks} date={selectedDate} />
  </div>
</div>

{/* Morning Intention */}
<div className="mb-8">
  <div className="flex items-center gap-2 mb-3 px-1">
    <div className="w-1 h-3 bg-blue-500 rounded-full" />
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
      Morning Intention
    </label>
  </div>
  <textarea
    value={morning}
    placeholder="What's your main focus today?"
    onChange={(e) => {
      setMorning(e.target.value)
      saveDay(tasks, e.target.value, reflection)
    }}
    className="w-full bg-slate-50 border-none rounded-[22px] p-4 text-[15px] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 resize-none min-h-[85px]"
  />
</div>

        {/* Task List Section */}
        <div className="space-y-0 relative">
          {tasks
            .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
            .map((task) => (
              <div 
                key={task.id} 
                onClick={() => setEditingTask(task)}
                className="flex items-start gap-4 py-4 border-b border-gray-100 active:bg-gray-50 transition-colors"
              >
                <div className="w-12 pt-1 text-sm font-bold">
                  {task.start}
                </div>
                <div className="flex gap-3 flex-1">
                  <div className="w-1 rounded-full bg-blue-400 self-stretch my-1" />
                  <div className="flex-1">
                    <h3 className={`text-lg font-medium leading-tight ${task.completed ? 'text-gray-400 line-through' : ''}`}>
                      {task.text}
                    </h3>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">
                      {task.start} - {task.end} {task.goal_id && `• ${goalsMap[task.goal_id]}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
                  className={`mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-200'}`}
                >
                  {task.completed && <Plus className="text-white w-4 h-4 rotate-45" />}
                </button>
              </div>
            ))}
        </div>

        {/* Add Event Placeholder */}
        <button 
          onClick={() => setTaskModalHour(new Date().getHours())}
          className="w-full bg-gray-100 text-gray-500 py-3 px-6 rounded-full mt-6 text-left text-sm font-medium"
        >
          Add event on {selectedDate.getDate()} (Please click here to add)
        </button>
      </div>

      {/* Samsung Floating Action Button */}
      <button
        onClick={() => setTaskModalHour(new Date().getHours())}
        className="fixed bottom-6 right-6 w-16 h-16 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] rounded-full flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
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
            saveDay(updated, morning, reflection)
            setTaskModalHour(null)
            setEditingTask(null)
          }}
        />
      )}

      {/* Evening Reflection */}
<div className="mt-12 pb-10">
  <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest ml-1 mb-2 block">
    Evening Reflection
  </label>
  <textarea
    value={reflection}
    placeholder="How did the day go?"
    onChange={(e) => {
      setReflection(e.target.value)
      saveDay(tasks, morning, e.target.value)
    }}
    className="w-full bg-purple-50/40 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-400 resize-none min-h-[100px]"
  />
</div>

    </div>
    
  )
}