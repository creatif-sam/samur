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
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-[32px] p-6 border border-white/50 dark:border-slate-700/50 shadow-sm">
            <DaySummary tasks={tasks} completedTaskIds={completedTaskIds} visions={visionsMap} />
          </div>
          <div className="flex justify-start px-2">
            <FreeTimeExportButton tasks={tasks} date={selectedDate} />
          </div>
        </div>

        <div className="mb-10">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Morning Intention</label>
          <textarea
            value={morning}
            placeholder="Focus of the day..."
            onChange={(e) => { setMorning(e.target.value); saveDay(tasks, e.target.value, reflection, mood, completedTaskIds); }}
            className="w-full bg-white/40 dark:bg-slate-800/40 border-none rounded-[24px] p-5 text-[16px] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none min-h-[90px]"
          />
        </div>

        <div className="space-y-2 relative mb-10">
          {tasks
            .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
            .map((task) => {
              const isDone = completedTaskIds.includes(task.id);
              const vision = task.vision_id ? visionsMap[task.vision_id] : null;
              const isPartnerTask = task.owner_id && task.owner_id !== userId;

              return (
                <div 
                  key={task.id} 
                  onClick={() => !isPartnerTask && setEditingTask(task)} 
                  className={`flex flex-col gap-1 p-4 rounded-[28px] bg-white/30 dark:bg-slate-800/30 ${!isPartnerTask ? 'active:bg-white/60 dark:active:bg-slate-700/60 active:scale-[0.98] cursor-pointer' : 'opacity-75 cursor-default'} transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{task.start}</div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className={`w-1.5 h-10 rounded-full transition-colors duration-1000 ${isDone ? 'bg-slate-200 dark:bg-slate-700' : theme.accent}`} />
                      <div className="flex-1">
                        <h3 className={`text-[17px] font-semibold flex items-center gap-2 ${isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {task.text} 
                          {task.recurring && <RefreshCw className="w-3.5 h-3.5 opacity-30" />}
                        </h3>
                        <p className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">
                          {task.start} — {task.end}
                        </p>
                      </div>
                    </div>
                    {!isPartnerTask && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }} 
                        className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        {isDone && <Check className="text-white w-4 h-4 stroke-[3]" />}
                      </button>
                    )}
                  </div>

                  {vision && (
                    <div className="ml-16 flex items-center gap-1.5 py-1 px-3 bg-white/40 dark:bg-black/5 rounded-full w-fit animate-in fade-in slide-in-from-left-1 duration-500">
                      <span className="text-xs">{vision.emoji}</span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {vision.title}
                      </span>
                    </div>
                  )}
                  
                  {task.owner_id && task.owner_id !== userId && profilesMap[task.owner_id] && (
                    <div className="ml-16 flex items-center gap-2 py-1 px-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-full w-fit animate-in fade-in slide-in-from-left-1 duration-500">
                      {profilesMap[task.owner_id].avatar_url ? (
                        <img 
                          src={profilesMap[task.owner_id].avatar_url} 
                          alt={profilesMap[task.owner_id].name || 'Partner'} 
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-[8px] font-bold text-blue-700 dark:text-blue-200">
                          {(profilesMap[task.owner_id].name || 'P')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {profilesMap[task.owner_id].name || 'Partner'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <button 
          onClick={() => setTaskModalHour(new Date().getHours())} 
          className="w-full bg-slate-900/5 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 py-5 px-8 rounded-[28px] text-left text-[15px] font-semibold flex justify-between items-center active:bg-slate-900/10 dark:active:bg-slate-800/70 transition-colors"
        >
          Add event on {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          <Plus className="w-5 h-5 opacity-30" />
        </button>

        <div className="mt-14 pb-20">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 block px-2">Evening Reflection</label>
          <textarea
            value={reflection}
            placeholder="How did you finish your day?"
            onChange={(e) => { setReflection(e.target.value); saveDay(tasks, morning, e.target.value, mood, completedTaskIds); }}
            className="w-full bg-purple-50/20 dark:bg-purple-900/10 border-none rounded-[24px] p-5 text-[16px] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 transition-all resize-none min-h-[120px]"
          />
        </div>
      </div>

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