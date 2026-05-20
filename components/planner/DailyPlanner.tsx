'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar as CalendarIcon, Check, RefreshCw, BarChart3, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import MonthCalendar from './MonthCalendar'

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
  visibility?: 'private' | 'shared'
  owner_id?: string
  source_day?: string // The day this recurring task was originally created
  recurring?: {
    interval: number
    unit: 'day' | 'week' | 'month' 
    daysOfWeek: number[]
    until?: string
  }
}

type Vision = { id: string; title: string; emoji: string }
type UserProfile = { id: string; name?: string; avatar_url?: string }

const TASK_GRADIENTS = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-600 to-blue-700',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
]

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
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({})
  const [view, setView] = useState<'daily' | 'monthly'>('daily')
  const [taskDays, setTaskDays] = useState<Set<string>>(new Set())

  const dateKey = selectedDate.toISOString().split('T')[0]
  const theme = moodThemes[mood] || moodThemes['default']

  /**
   * STANDARD TIME CALCULATION
   * Corrects for tasks crossing midnight (e.g., 23:00 to 02:00)
   */
  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  // Used for sorting and checking relative order
  function getEffectiveMinutes(start: string, end: string) {
    const s = parseMinutes(start)
    let e = parseMinutes(end)
    if (e < s) e += 1440 // Add 24 hours if it ends the next day
    return { start: s, end: e }
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
  useEffect(() => { 
    loadVisions()
    loadUserProfile()
  }, [])
  useEffect(() => {
    if (view === 'monthly') loadTaskDays(selectedDate.getFullYear(), selectedDate.getMonth())
  }, [view])

  async function loadUserProfile() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, partner_id')
      .eq('id', auth.user.id)
      .single()
    
    if (profile) {
      setPartnerId(profile.partner_id || null)
      
      // Load both user and partner profiles
      const profileIds = [auth.user.id]
      if (profile.partner_id) profileIds.push(profile.partner_id)
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', profileIds)
      
      if (profiles) {
        const map: Record<string, UserProfile> = {}
        profiles.forEach((p) => { map[p.id] = p })
        setProfilesMap(map)
      }
    }
  }

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
    
    setUserId(auth.user.id)
    
    // Get user's partner_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', auth.user.id)
      .single()
    
    // Load today's data for current user
    const { data: todayData } = await supabase
      .from('planner_days')
      .select('tasks, morning, reflection, mood, completed_task_ids')
      .eq('day', dateKey)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    // Load all days to find recurring tasks - include both user and partner
    const userIds = [auth.user.id]
    if (profile?.partner_id) userIds.push(profile.partner_id)
    
    const { data: allDays } = await supabase
      .from('planner_days')
      .select('tasks, user_id, day')
      .in('user_id', userIds)
      .not('tasks', 'is', null)

    const allUniqueTasks = new Map<string, PlannerTask>();
    
    // Add today's tasks
    if (Array.isArray(todayData?.tasks)) {
      todayData.tasks.forEach((t: PlannerTask) => {
        // Ensure owner_id is set for existing tasks
        if (!t.owner_id) t.owner_id = auth.user.id
        if (t.visibility === undefined) t.visibility = 'private'
        allUniqueTasks.set(t.id, t)
      })
    }
    
    // Add recurring tasks from all days (both user and partner)
    allDays?.forEach(dayRecord => {
      if (Array.isArray(dayRecord.tasks)) {
        dayRecord.tasks.forEach((t: PlannerTask) => {
          if (t.recurring && !allUniqueTasks.has(t.id)) {
            // Check if task should show on this date
            if (shouldShowTask(t, selectedDate)) {
              // Ensure owner_id is set
              if (!t.owner_id) t.owner_id = dayRecord.user_id
              if (!t.source_day) t.source_day = dayRecord.day
              if (t.visibility === undefined) t.visibility = 'private'
              
              // Only show partner tasks if they're shared
              if (dayRecord.user_id === auth.user.id || t.visibility === 'shared') {
                allUniqueTasks.set(t.id, t)
              }
            }
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

  async function loadTaskDays(year: number, month: number) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase
      .from('planner_days')
      .select('day')
      .eq('user_id', auth.user.id)
      .gte('day', start)
      .lte('day', end)
      .not('tasks', 'is', null)
    if (data) {
      setTaskDays(new Set(data.map(d => d.day)))
    }
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
    
    // Separate user's tasks from partner's tasks
    const userTasks = updatedTasks.filter(t => !t.owner_id || t.owner_id === auth.user.id)
    
    // Save current day data with only user's tasks
    await supabase.from('planner_days').upsert({
      day: dateKey, 
      user_id: auth.user.id, 
      tasks: userTasks,
      completed_task_ids: updatedCompletedIds, 
      morning: updatedMorning, 
      reflection: updatedReflection, 
      mood: updatedMood, 
      visibility: 'private',
    }, { onConflict: 'user_id,day' })
  }
  
  async function updateRecurringTask(task: PlannerTask) {
    // Update the recurring task at its source day
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return
    if (!task.source_day || task.owner_id !== auth.user.id) return
    
    // Load the source day
    const { data: sourceData } = await supabase
      .from('planner_days')
      .select('tasks')
      .eq('day', task.source_day)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    
    if (sourceData && Array.isArray(sourceData.tasks)) {
      // Update the task in the source day
      const updatedSourceTasks = sourceData.tasks.map((t: PlannerTask) => 
        t.id === task.id ? task : t
      )
      
      await supabase
        .from('planner_days')
        .update({ tasks: updatedSourceTasks })
        .eq('day', task.source_day)
        .eq('user_id', auth.user.id)
    }
  }
  
  async function deleteRecurringTask(taskId: string, ownerId: string) {
    // Delete recurring task from all days
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user || ownerId !== auth.user.id) return
    
    // Load all the user's days
    const { data: allDays } = await supabase
      .from('planner_days')
      .select('day, tasks')
      .eq('user_id', auth.user.id)
      .not('tasks', 'is', null)
    
    if (allDays) {
      // Remove the task from all days
      const updates = allDays
        .map(dayRecord => {
          if (!Array.isArray(dayRecord.tasks)) return null
          const filtered = dayRecord.tasks.filter((t: PlannerTask) => t.id !== taskId)
          if (filtered.length === dayRecord.tasks.length) return null // No change
          return { day: dayRecord.day, tasks: filtered }
        })
        .filter(Boolean)
      
      // Batch update all affected days
      for (const update of updates) {
        if (update) {
          await supabase
            .from('planner_days')
            .update({ tasks: update.tasks })
            .eq('day', update.day)
            .eq('user_id', auth.user.id)
        }
      }
    }
  }

  function toggleComplete(taskId: string) {
    const updatedIds = completedTaskIds.includes(taskId) 
      ? completedTaskIds.filter(id => id !== taskId) : [...completedTaskIds, taskId];
    setCompletedTaskIds(updatedIds);
    saveDay(tasks, morning, reflection, mood, updatedIds);
  }

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${theme.bg} font-sans pb-32`}>
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
            <Link href="/protected/analytics" className="transition-transform active:scale-90">
              <BarChart3 className={`w-7 h-7 ${theme.text} opacity-80`} />
            </Link>

            <button
              onClick={() => setView(v => v === 'monthly' ? 'daily' : 'monthly')}
              className={`relative transition-transform active:scale-90 ${view === 'monthly' ? 'scale-110' : ''}`}
            >
              <CalendarIcon className={`w-7 h-7 ${theme.text} ${view === 'monthly' ? 'opacity-100' : 'opacity-80'}`} />
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${theme.text}`}>{new Date().getDate()}</span>
            </button>
          </div>
        </div>
      </header>

      {view === 'monthly' ? (
        <MonthCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onClose={() => setView('daily')}
          taskDays={taskDays}
          onMonthChange={loadTaskDays}
          tasks={tasks}
          completedTaskIds={completedTaskIds}
          visionsMap={visionsMap}
        />
      ) : (
        <>
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
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-[32px] p-6 border border-white/50 dark:border-slate-700/50 shadow-sm">
            <DaySummary tasks={tasks} completedTaskIds={completedTaskIds} visions={visionsMap} />
          </div>
          <div className="flex justify-start px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
          </div>
        </div>

        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Morning Intention</span>
              </div>
              <textarea
                value={morning}
                placeholder="Focus of the day..."
                onChange={(e) => { setMorning(e.target.value); saveDay(tasks, e.target.value, reflection, mood, completedTaskIds); }}
                className="w-full bg-transparent border-none text-white text-[16px] font-semibold placeholder:text-white/40 focus:ring-0 resize-none outline-none min-h-[70px]"
              />
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-50 ${theme.text}`}>
              Today&apos;s Schedule
            </span>
            <span className={`text-[10px] font-semibold opacity-40 ${theme.text}`}>
              {tasks.length} event{tasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="space-y-3 relative mb-8">
          {tasks
            .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
            .map((task, idx) => {
              const isDone = completedTaskIds.includes(task.id);
              const vision = task.vision_id ? visionsMap[task.vision_id] : null;
              const isPartnerTask = task.owner_id && task.owner_id !== userId;
              const gradient = TASK_GRADIENTS[idx % TASK_GRADIENTS.length]

              return (
                <div
                  key={task.id}
                  onClick={() => !isPartnerTask && setEditingTask(task)}
                  className={`relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br ${gradient} ${isDone ? 'opacity-60' : ''} ${!isPartnerTask ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'} transition-all shadow-sm`}
                >
                  {/* Decorative circle */}
                  <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

                  <div className="relative z-10">
                    {/* Time + completion row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest tabular-nums">
                          {task.start} — {task.end}
                        </span>
                        {task.recurring && <RefreshCw className="w-3 h-3 text-white/40" />}
                      </div>
                      {!isPartnerTask && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-white border-white' : 'border-white/50 hover:border-white'}`}
                        >
                          {isDone && <Check className="w-3 h-3 text-slate-600 stroke-[3]" />}
                        </button>
                      )}
                    </div>

                    {/* Task title */}
                    <h3 className={`text-base font-black text-white leading-snug ${isDone ? 'line-through' : ''}`}>
                      {task.text}
                    </h3>

                    {/* Vision badge */}
                    {vision && (
                      <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                        <span className="text-[10px]">{vision.emoji}</span>
                        <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{vision.title}</span>
                      </div>
                    )}

                    {/* Partner badge */}
                    {task.owner_id && task.owner_id !== userId && profilesMap[task.owner_id] && (
                      <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                        {profilesMap[task.owner_id].avatar_url ? (
                          <img
                            src={profilesMap[task.owner_id].avatar_url}
                            alt={profilesMap[task.owner_id].name || 'Partner'}
                            className="w-3.5 h-3.5 rounded-full"
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center text-[7px] font-bold text-white">
                            {(profilesMap[task.owner_id].name || 'P')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">
                          {profilesMap[task.owner_id].name || 'Partner'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>

        <button
          onClick={() => setTaskModalHour(new Date().getHours())}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 px-6 rounded-3xl font-bold text-[15px] flex justify-between items-center active:scale-[0.98] transition-all shadow-sm"
        >
          Add event on {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          <Plus className="w-5 h-5" />
        </button>

        <div className="mt-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Evening Reflection</span>
              </div>
              <textarea
                value={reflection}
                placeholder="How did you finish your day?"
                onChange={(e) => { setReflection(e.target.value); saveDay(tasks, morning, e.target.value, mood, completedTaskIds); }}
                className="w-full bg-transparent border-none text-white text-[16px] font-semibold placeholder:text-white/40 focus:ring-0 resize-none outline-none min-h-[100px]"
              />
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      <button onClick={() => setTaskModalHour(new Date().getHours())} className="fixed bottom-[100px] right-6 w-16 h-16 bg-white dark:bg-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-50 dark:border-slate-700 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40">
        <Plus className="w-9 h-9 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
      </button>

      {(taskModalHour !== null || editingTask) && (
        <TaskModal 
          hour={editingTask ? parseInt(editingTask.start.split(':')[0]) : taskModalHour!} 
          existingTask={editingTask} 
          userId={userId}
          onClose={() => { setTaskModalHour(null); setEditingTask(null); }} 
          onSave={async (task) => {
            // Ensure new tasks have correct owner_id and source_day
            if (!task.owner_id) task.owner_id = userId || undefined
            if (task.recurring && !task.source_day) task.source_day = dateKey
            
            if (editingTask) {
              // Editing existing task
              if (task.recurring && editingTask.recurring) {
                // Recurring task being edited - update at source
                await updateRecurringTask(task)
                // Reload to get fresh data
                await loadDay()
              } else {
                // Non-recurring or converted from/to recurring
                const updated = tasks.map((t) => (t.id === task.id ? task : t))
                setTasks(updated)
                saveDay(updated, morning, reflection, mood, completedTaskIds)
              }
            } else {
              // New task
              const updated = [...tasks, task]
              setTasks(updated)
              saveDay(updated, morning, reflection, mood, completedTaskIds)
            }
            
            setTaskModalHour(null)
            setEditingTask(null)
          }}
          onDelete={async (taskId, deleteAll) => {
            if (deleteAll && editingTask?.recurring && editingTask.owner_id) {
              // Delete all recurring instances
              await deleteRecurringTask(taskId, editingTask.owner_id)
              // Reload to get fresh data
              await loadDay()
            } else {
              // Delete only from current day
              const updated = tasks.filter((t) => t.id !== taskId)
              setTasks(updated)
              saveDay(updated, morning, reflection, mood, completedTaskIds)
            }
            setTaskModalHour(null)
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}