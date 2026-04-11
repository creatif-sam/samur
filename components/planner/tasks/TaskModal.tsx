'use client'

import { useEffect, useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'
import { TaskBasics } from './TaskBasics'
import { TaskRecurrence } from './TaskRecurrence'
import { Modal } from './Modal'
import { Clock, ArrowRight, X, Calendar as CalendarIcon, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function TaskModal({
  hour,
  existingTask,
  userId,
  onClose,
  onSave,
  onDelete,
}: {
  hour: number
  existingTask?: PlannerTask | null
  userId: string | null
  onClose: () => void
  onSave: (t: PlannerTask) => void
  onDelete?: (taskId: string, deleteAll: boolean) => void
}) {
  const [text, setText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [visionId, setVisionId] = useState<string | null>(null)
  const [recurring, setRecurring] = useState<PlannerTask['recurring'] | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Determine if user can edit this task
  const canEdit = !existingTask || !existingTask.owner_id || existingTask.owner_id === userId

  useEffect(() => {
    if (existingTask) {
      setText(existingTask.text)
      setStartTime(existingTask.start)
      setEndTime(existingTask.end)
      setVisionId(existingTask.vision_id ?? null)
      setRecurring(existingTask.recurring ?? null)
      setVisibility(existingTask.visibility || 'private')
    } else {
      const hStart = hour.toString().padStart(2, '0')
      const hEnd = (hour + 1).toString().padStart(2, '0')
      setStartTime(`${hStart}:00`)
      setEndTime(`${hEnd}:00`)
      setVisibility('private')
    }
  }, [existingTask, hour])

  function handleDelete(deleteAll: boolean) {
    if (existingTask && onDelete) {
      onDelete(existingTask.id, deleteAll)
      toast.success(deleteAll ? 'All recurring events deleted' : 'Event deleted')
      onClose()
    }
  }

  function handleSave() {
    if (!text.trim()) return
    
    if (existingTask && existingTask.recurring && JSON.stringify(recurring) !== JSON.stringify(existingTask.recurring)) {
      // Recurring settings changed - ask if they want to update all
      toast.warning('Update recurring event?', {
        description: 'This is a recurring event',
        action: {
          label: 'Update All',
          onClick: () => {
            saveTask()
            toast.success('All recurring events updated')
          }
        },
        cancel: {
          label: 'This Only',
          onClick: () => {
            saveTask()
            toast.success('Event updated')
          }
        },
        duration: 10000
      })
    } else {
      saveTask()
    }
  }

  function saveTask() {
    onSave({
      id: existingTask?.id ?? crypto.randomUUID(),
      text,
      start: startTime,
      end: endTime,
      completed: existingTask?.completed ?? false,
      vision_id: visionId ?? undefined,
      recurring: recurring ?? undefined,
      visibility: visibility,
      owner_id: existingTask?.owner_id ?? userId ?? undefined,
      source_day: existingTask?.source_day
    })
    onClose()
  }

  function getDurationLabel() {
    const [sH, sM] = startTime.split(':').map(Number)
    const [eH, eM] = endTime.split(':').map(Number)
    let diff = (eH * 60 + eM) - (sH * 60 + sM)
    if (diff < 0) diff += 1440 
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`
  }

  return (
    <Modal onClose={onClose}>
      {/* Container: max-w-4xl for PC, w-[95vw] for mobile to prevent overflow */}
      <div className="w-[95vw] md:w-full md:max-w-4xl bg-white dark:bg-slate-900 rounded-[28px] md:rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mx-auto">
        
        {/* Header */}
        <div className="px-5 md:px-8 pt-6 md:pt-8 pb-4 flex justify-between items-start border-b border-slate-50 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <input
              autoFocus
              type="text"
              placeholder="What's happening?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xl md:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 dark:text-white truncate disabled:opacity-60"
            />
            <p className="text-[9px] md:text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-1">
              {existingTask ? (canEdit ? 'Modify Schedule' : 'View Schedule') : 'New Plan'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full ml-2">
            <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
          
          {/* LEFT COLUMN: Time & Vision */}
          <div className="space-y-6 md:space-y-8">
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> Timeline
                </label>
                <span className="text-[9px] md:text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                  {getDurationLabel()}
                </span>
              </div>
              
              {/* FIXED TIME ROW: Uses smaller text and padding on mobile */}
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => {
                      const newStartTime = e.target.value
                      setStartTime(newStartTime)
                      // Auto-adjust end time to one hour later
                      const [hours, minutes] = newStartTime.split(':').map(Number)
                      const newEndHour = (hours + 1) % 24
                      const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                      setEndTime(newEndTime)
                    }}
                    disabled={!canEdit}
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed" 
                  />
                </div>
                <ArrowRight className="text-slate-300 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={(e)=>setEndTime(e.target.value)} 
                    disabled={!canEdit}
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed" 
                  />
                </div>
              </div>
            </div>

            <TaskBasics
              text={text}
              visionId={visionId}
              onTextChange={setText}
              onVisionChange={setVisionId}
              hideTitle={true}
            />
            
            {/* Visibility Toggle */}
            {canEdit && (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-slate-100 dark:border-slate-700">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  Task Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      visibility === 'private' 
                        ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' 
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <EyeOff className="w-4 h-4 inline mr-1" />
                    Private
                  </button>
                  <button
                    onClick={() => setVisibility('shared')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      visibility === 'shared' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Shared
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {visibility === 'shared' ? 'Your partner can see this task' : 'Only you can see this task'}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Recurrence */}
          <div className="lg:border-l lg:pl-10 lg:border-slate-100 lg:dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <CalendarIcon size={12} /> Recurrence Rules
            </div>
            <TaskRecurrence
              value={recurring}
              onChange={setRecurring}
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50 dark:bg-slate-800/20 flex flex-row gap-3 justify-between items-center">
          {!canEdit ? (
            <>
              <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 italic">
                You can only view this task
              </div>
              <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white">
                Close
              </button>
            </>
          ) : (
            <>
              {existingTask && onDelete ? (
                <button
                  onClick={() => {
                    if (existingTask.recurring) {
                      // Ask if they want to delete this or all recurring events
                      toast.warning(`Delete "${existingTask.text}"?`, {
                        description: 'This is a recurring event',
                        action: {
                          label: 'Delete All',
                          onClick: () => handleDelete(true)
                        },
                        cancel: {
                          label: 'This Only',
                          onClick: () => handleDelete(false)
                        },
                        duration: 10000
                      })
                    } else {
                      // Simple delete confirmation
                      toast.warning(`Delete "${existingTask.text}"?`, {
                        description: 'This action cannot be undone',
                        action: {
                          label: 'Delete',
                          onClick: () => handleDelete(false)
                        },
                        cancel: {
                          label: 'Cancel',
                          onClick: () => toast.dismiss()
                        },
                        duration: 10000
                      })
                    }
                  }}
                  className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              ) : (
                <button onClick={onClose} className="px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
                  Discard
                </button>
              )}
              
              <div className="flex gap-3">
                {existingTask && (
                  <button onClick={onClose} className="px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
                    Cancel
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className={`flex-1 md:flex-none md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg transition-all ${text.trim() ? 'bg-blue-600 text-white active:scale-95 shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {existingTask ? 'Save Changes' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}