'use client'

import { useEffect, useState } from 'react'
import type { PlannerTask } from '../DailyPlanner'
import { TaskBasics } from './TaskBasics'
import { TaskRecurrence } from './TaskRecurrence'
import { Modal } from './Modal'
import { Clock, ArrowRight } from 'lucide-react'

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
      setText('')
      setStartTime(`${hStart}:00`)
      setEndTime(`${hEnd}:00`)
      setVisionId(null)
      setRecurring(null)
    }
  }, [existingTask, hour])

  function getDurationLabel() {
    const [sH, sM] = startTime.split(':').map(Number)
    const [eH, eM] = endTime.split(':').map(Number)
    let diff = (eH * 60 + eM) - (sH * 60 + sM)
    if (diff < 0) diff += 1440 
    
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : h === 0 ? "0m" : ""}`
  }

  function handleSave() {
    if (!text.trim()) return alert("Please enter a title")
    
    onSave({
      id: existingTask?.id ?? crypto.randomUUID(),
      text,
      start: startTime,
      end: endTime,
      completed: existingTask?.completed ?? false,
      vision_id: visionId ?? undefined, // 'undefined' is fine, but ensures it's optional
      recurring: recurring ?? undefined,
    })
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-6 pb-2">
        {/* Header */}
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xl font-bold tracking-tight text-slate-900">
            {existingTask ? 'Edit Event' : 'New Event'}
          </h3>
          <span className="text-[12px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">
            {getDurationLabel()}
          </span>
        </div>

        {/* Task Title Input */}
        <div className="relative group">
          <input
            autoFocus
            type="text"
            placeholder="What's happening?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full text-lg font-medium border-b-2 border-slate-100 focus:border-blue-500 transition-colors py-2 outline-none placeholder:text-slate-300"
          />
        </div>

        {/* Time Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
            <Clock size={14} />
            <span>Time Period</span>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[24px]">
            <div className="flex-1 bg-white rounded-[18px] p-3 shadow-sm border border-slate-100">
              <p className="text-[10px] text-blue-500 font-bold uppercase mb-1 text-center">Start</p>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-center font-bold text-lg bg-transparent border-none focus:ring-0 cursor-pointer"
              />
            </div>

            <ArrowRight className="text-slate-300 shrink-0" size={20} />

            <div className="flex-1 bg-white rounded-[18px] p-3 shadow-sm border border-slate-100">
              <p className="text-[10px] text-purple-500 font-bold uppercase mb-1 text-center">End</p>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-center font-bold text-lg bg-transparent border-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modular Components */}
        <div className="space-y-4 pt-2">
          <TaskBasics
            text={text}
            visionId={visionId} // Matches the updated TaskBasics.tsx
            onTextChange={setText}
            onVisionChange={setVisionId}
            hideTitle={true} // We already have a title input above
          />

          <TaskRecurrence
            value={recurring}
            onChange={setRecurring}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-600 font-bold rounded-full py-4 hover:bg-slate-200 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white font-bold rounded-full py-4 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}