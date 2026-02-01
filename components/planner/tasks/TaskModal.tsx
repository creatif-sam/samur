'use client'

import { useEffect, useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'
import { TaskBasics } from './TaskBasics'
import { TaskRecurrence } from './TaskRecurrence'
import { Modal } from './Modal'
import { Clock, ArrowRight, X, Calendar as CalendarIcon } from 'lucide-react'

export function TaskModal({
  hour,
  existingTask,
  onClose,
  onSave,
}: {
  hour: number
  existingTask?: PlannerTask | null
  onClose: () => void
  onSave: (t: PlannerTask) => void
}) {
  const [text, setText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [visionId, setVisionId] = useState<string | null>(null)
  const [recurring, setRecurring] = useState<PlannerTask['recurring'] | null>(null)

  useEffect(() => {
    if (existingTask) {
      setText(existingTask.text)
      setStartTime(existingTask.start)
      setEndTime(existingTask.end)
      setVisionId(existingTask.vision_id ?? null)
      setRecurring(existingTask.recurring ?? null)
    } else {
      const hStart = hour.toString().padStart(2, '0')
      const hEnd = (hour + 1).toString().padStart(2, '0')
      setStartTime(`${hStart}:00`)
      setEndTime(`${hEnd}:00`)
    }
  }, [existingTask, hour])

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
              className="w-full text-xl md:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 dark:text-white truncate"
            />
            <p className="text-[9px] md:text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-1">
              {existingTask ? 'Modify Schedule' : 'New Plan'}
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
                    onChange={(e)=>setStartTime(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
                <ArrowRight className="text-slate-300 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={(e)=>setEndTime(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-800 rounded-lg md:rounded-xl p-2 md:p-3 text-sm md:text-xl font-bold text-center border border-slate-200 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" 
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
        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50 dark:bg-slate-800/20 flex flex-row gap-3 justify-end">
          <button onClick={onClose} className="px-4 md:px-8 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600">
            Discard
          </button>
          <button 
            onClick={() => text.trim() && onSave({ id: existingTask?.id ?? crypto.randomUUID(), text, start: startTime, end: endTime, completed: existingTask?.completed ?? false, vision_id: visionId ?? undefined, recurring: recurring ?? undefined })}
            className={`flex-1 md:flex-none md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg transition-all ${text.trim() ? 'bg-blue-600 text-white active:scale-95 shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {existingTask ? 'Save Changes' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}