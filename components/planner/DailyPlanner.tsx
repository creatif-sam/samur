'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar as CalendarIcon, Check, RefreshCw, BarChart3 } from 'lucide-react'
import Link from 'next/link'

import { TaskModal } from './tasks/TaskModal'
import TopCalendar from './TopCalendar'
import DaySummary from './DailySummary'
import FreeTimeExportButton from './FreeTimeExportButton'
import MoodPicker, { moodThemes } from './MoodPicker'

export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
  vision_id?: string 
  recurring?: {
    interval: number
    unit: 'day' | 'week' | 'month' 
    daysOfWeek: number[]
    until?: string
  }
}

type Vision = { id: string; title: string; emoji: string }

export default function DailyPlanner() {
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [morning, setMorning] = useState('')
  const [reflection, setReflection] = useState('')
  const [mood, setMood] = useState('')
  const [taskModalHour, setTaskModalHour] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null)
  const [visionsMap, setVisionsMap] = useState<Record<string, Vision>>({})

  const dateKey = selectedDate.toISOString().split('T')[0]
  const theme = moodThemes[mood] || moodThemes['default']

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  function shouldShowTask(task: PlannerTask, date: Date) {
    if (!task.recurring) return false; 
    const dayOfWeek = date.getDay();
    const untilDate = task.recurring.until ? new Date(task.recurring.until) : null;
    if (untilDate && date > untilDate) return false;
    if (task.recurring.unit === 'day') return true;
    if (task.recurring.unit === 'week') return task.recurring.daysOfWeek.includes(dayOfWeek);
    if (task.recurring.unit === 'month') return date.getDate() === new Date(dateKey).getDate(); 
    return false;
  }

  useEffect(() => { loadDay() }, [dateKey])
  useEffect(() => { loadVisions() }, [])

  async function loadVisions() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const { data: visions } = await supabase.from('visions').select('id, title, emoji').eq('owner_id', auth.user.id) 
    if (visions) {
      const map: Record<string, Vision> = {}
      visions.forEach((v) => { map[v.id] = v })
      setVisionsMap(map)
    }
  }

  async function loadDay() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const { data: todayData } = await supabase
      .from('planner_days')
      .select('tasks, morning, reflection, mood, completed_task_ids')
      .eq('day', dateKey)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    const { data: allDays } = await supabase.from('planner_days').select('tasks').eq('user_id', auth.user.id).not('tasks', 'is', null)

    const allUniqueTasks = new Map<string, PlannerTask>();
    if (Array.isArray(todayData?.tasks)) todayData.tasks.forEach((t: PlannerTask) => allUniqueTasks.set(t.id, t));
    
    allDays?.forEach(day => {
      if (Array.isArray(day.tasks)) {
        day.tasks.forEach((t: PlannerTask) => {
          if (t.recurring && !allUniqueTasks.has(t.id)) {
            if (shouldShowTask(t, selectedDate)) allUniqueTasks.set(t.id, t);
          }
        });
      }
    });

    setTasks(Array.from(allUniqueTasks.values()))
    setCompletedTaskIds(todayData?.completed_task_ids || [])
    setMorning(todayData?.morning ?? '')
    setReflection(todayData?.reflection ?? '')
    setMood(todayData?.mood ?? '')
  }

  async function saveDay(
    updatedTasks = tasks, 
    updatedMorning = morning, 
    updatedReflection = reflection, 
    updatedMood = mood,
    updatedCompletedIds = completedTaskIds
  ) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    await supabase.from('planner_days').upsert({
      day: dateKey, user_id: auth.user.id, tasks: updatedTasks,
      completed_task_ids: updatedCompletedIds, morning: updatedMorning, 
      reflection: updatedReflection, mood: updatedMood, visibility: 'private',
    }, { onConflict: 'user_id,day' })
  }

  function toggleComplete(taskId: string) {
    const updatedIds = completedTaskIds.includes(taskId) 
      ? completedTaskIds.filter(id => id !== taskId) : [...completedTaskIds, taskId];
    setCompletedTaskIds(updatedIds);
    saveDay(tasks, morning, reflection, mood, updatedIds);
  }

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${theme.bg} text-black font-sans pb-32`}>
      <header className={`sticky top-0 transition-colors duration-1000 z-30 px-6 pt-12 pb-4 ${theme.bg} backdrop-blur-md`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className={`text-3xl font-light uppercase tracking-[0.2em] opacity-40 ${theme.text}`}>{selectedDate.toLocaleString('default', { month: 'short' })}</h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold tracking-tighter ${theme.text}`}>{selectedDate.getDate()}</span>
              <span className={`text-lg font-semibold uppercase opacity-40 ${theme.text}`}>{selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            {/* Analytics Link Icon */}
            <Link href="/protected/analytics" className="transition-transform active:scale-90">
              <BarChart3 className={`w-7 h-7 ${theme.text} opacity-80`} />
            </Link>

            <div className="relative">
              <CalendarIcon className={`w-7 h-7 ${theme.text} opacity-80`} />
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${theme.text}`}>{new Date().getDate()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-2 mt-4">
        <TopCalendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="mt-8 px-6">
        <MoodPicker 
          currentMood={mood} 
          onMoodSelect={(newMood) => {
            setMood(newMood)
            saveDay(tasks, morning, reflection, newMood, completedTaskIds)
          }} 
        />

        <div className="space-y-3 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-[32px] p-6 border border-white/50 shadow-sm">
            <DaySummary tasks={tasks} completedTaskIds={completedTaskIds} visions={visionsMap} />
          </div>
          <div className="flex justify-start px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
          </div>
        </div>

        <div className="mb-10">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block px-2">Morning Intention</label>
          <textarea
            value={morning}
            placeholder="Focus of the day..."
            onChange={(e) => { setMorning(e.target.value); saveDay(tasks, e.target.value, reflection, mood, completedTaskIds); }}
            className="w-full bg-white/40 border-none rounded-[24px] p-5 text-[16px] focus:ring-2 focus:ring-blue-100 transition-all resize-none min-h-[90px]"
          />
        </div>

        <div className="space-y-2 relative mb-10">
          {tasks
            .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
            .map((task) => {
              const isDone = completedTaskIds.includes(task.id);
              const vision = task.vision_id ? visionsMap[task.vision_id] : null;

              return (
                <div 
                  key={task.id} 
                  onClick={() => setEditingTask(task)} 
                  className="flex flex-col gap-1 p-4 rounded-[28px] active:bg-white/50 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-sm font-bold text-slate-900 tabular-nums">{task.start}</div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className={`w-1.5 h-10 rounded-full transition-colors duration-1000 ${isDone ? 'bg-slate-200' : theme.accent}`} />
                      <div className="flex-1">
                        <h3 className={`text-[17px] font-semibold flex items-center gap-2 ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.text} 
                          {task.recurring && <RefreshCw className="w-3.5 h-3.5 opacity-30" />}
                        </h3>
                        <p className="text-[13px] text-slate-400 font-medium">
                          {task.start} — {task.end}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }} 
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}
                    >
                      {isDone && <Check className="text-white w-4 h-4 stroke-[3]" />}
                    </button>
                  </div>

                  {vision && (
                    <div className="ml-16 flex items-center gap-1.5 py-1 px-3 bg-white/40 dark:bg-black/5 rounded-full w-fit animate-in fade-in slide-in-from-left-1 duration-500">
                      <span className="text-xs">{vision.emoji}</span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {vision.title}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <button 
          onClick={() => setTaskModalHour(new Date().getHours())} 
          className="w-full bg-slate-900/5 text-slate-500 py-5 px-8 rounded-[28px] text-left text-[15px] font-semibold flex justify-between items-center active:bg-slate-900/10 transition-colors"
        >
          Add event on {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          <Plus className="w-5 h-5 opacity-30" />
        </button>

        <div className="mt-14 pb-20">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block px-2">Evening Reflection</label>
          <textarea
            value={reflection}
            placeholder="How did you finish your day?"
            onChange={(e) => { setReflection(e.target.value); saveDay(tasks, morning, e.target.value, mood, completedTaskIds); }}
            className="w-full bg-purple-50/20 border-none rounded-[24px] p-5 text-[16px] focus:ring-2 focus:ring-purple-100 transition-all resize-none min-h-[120px]"
          />
        </div>
      </div>

      <button onClick={() => setTaskModalHour(new Date().getHours())} className="fixed bottom-[100px] right-6 w-16 h-16 bg-white shadow-[0_12px_40_rgba(0,0,0,0.12)] border border-slate-50 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40">
        <Plus className="w-9 h-9 text-slate-800" strokeWidth={1.5} />
      </button>

      {(taskModalHour !== null || editingTask) && (
        <TaskModal 
          hour={editingTask ? parseInt(editingTask.start.split(':')[0]) : taskModalHour!} 
          existingTask={editingTask} 
          onClose={() => { setTaskModalHour(null); setEditingTask(null); }} 
          onSave={(task) => {
            const updated = editingTask ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task]
            setTasks(updated)
            saveDay(updated, morning, reflection, mood, completedTaskIds)
            setTaskModalHour(null)
            setEditingTask(null)
          }} 
        />
      )}
    </div>
  )
}