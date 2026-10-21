'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Copy, LayoutTemplate, Loader2, Save, Trash2, X } from 'lucide-react'
import { Modal } from './tasks/Modal'
import { addDays } from '@/lib/dates'
import { fetchDayRows } from '@/lib/planner/queries'
import { sortByStart, type PlannerTask } from '@/lib/planner/tasks'

// What a template keeps of a task: no ids, owners, completion or repeat rules
export type TemplateTask = Pick<PlannerTask, 'text' | 'start' | 'end' | 'vision_id' | 'visibility' | 'reminder'>

type Template = { id: string; name: string; tasks: TemplateTask[]; created_at: string }

function toTemplateTask(t: PlannerTask): TemplateTask {
  return { text: t.text, start: t.start, end: t.end, vision_id: t.vision_id, visibility: t.visibility, reminder: t.reminder }
}

interface Props {
  userId: string
  dateKey: string
  dayLabel: string
  // The user's own tasks on this day (recurring ones are left out of templates)
  dayTasks: PlannerTask[]
  onApply: (tasks: TemplateTask[], source: string) => void
  onClose: () => void
}

export default function PlannerTemplates({ userId, dateKey, dayLabel, dayTasks, onApply, onClose }: Props) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)

  const savable = sortByStart(dayTasks.filter(t => !t.recurring && (!t.owner_id || t.owner_id === userId)))

  useEffect(() => {
    supabase
      .from('planner_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load templates', error)
          setUnavailable(true)
        } else {
          setTemplates((data ?? []) as Template[])
        }
        setLoading(false)
      })
  }, [userId])

  async function copyPreviousDay() {
    setCopying(true)
    try {
      const yesterday = addDays(dateKey, -1)
      const rows = await fetchDayRows(supabase, [userId], yesterday)
      const tasks = (rows[0]?.tasks ?? []).filter(t => t && !t.recurring)
      if (tasks.length === 0) {
        toast('Nothing to copy: the day before has no one-off events')
        return
      }
      onApply(sortByStart(tasks).map(toTemplateTask), 'the day before')
    } catch {
      toast.error("Couldn't load the day before. Check your connection.")
    } finally {
      setCopying(false)
    }
  }

  async function saveTemplate() {
    const value = name.trim()
    if (!value || savable.length === 0) return
    setSaving(true)
    const { data, error } = await supabase
      .from('planner_templates')
      .insert({ user_id: userId, name: value, tasks: savable.map(toTemplateTask) })
      .select()
      .single()
    setSaving(false)
    if (error) {
      toast.error("Couldn't save the template.")
      return
    }
    setTemplates(t => [...t, data as Template])
    setName('')
    toast.success(`Saved "${value}"`)
  }

  async function deleteTemplate(template: Template) {
    setTemplates(t => t.filter(x => x.id !== template.id))
    const { error } = await supabase.from('planner_templates').delete().eq('id', template.id)
    if (error) {
      setTemplates(t => [...t, template])
      toast.error("Couldn't delete the template.")
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-violet-500" /> Plan faster
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <button
            onClick={copyPreviousDay}
            disabled={copying}
            className="w-full flex items-center justify-between rounded-2xl bg-violet-600 text-white px-4 py-3 text-sm font-bold active:scale-[0.98] disabled:opacity-60"
          >
            <span className="flex items-center gap-2"><Copy className="w-4 h-4" /> Copy the day before</span>
            {copying && <Loader2 className="w-4 h-4 animate-spin" />}
          </button>

          {unavailable ? (
            <p className="text-xs text-slate-500">Templates need the latest database update. Run the planner migration in Supabase to enable them.</p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your templates</p>
                {loading ? (
                  <div className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ) : templates.length === 0 ? (
                  <p className="text-xs text-slate-400">No templates yet. Save a typical day below to reuse it.</p>
                ) : (
                  <ul className="space-y-2">
                    {templates.map(t => (
                      <li key={t.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {t.tasks.length} event{t.tasks.length !== 1 ? 's' : ''}
                            {t.tasks[0] && ` · from ${t.tasks[0].start}`}
                          </p>
                        </div>
                        <button
                          onClick={() => onApply(t.tasks, `"${t.name}"`)}
                          className="shrink-0 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-3 py-1.5 text-xs font-bold active:scale-95"
                        >
                          Apply
                        </button>
                        <button onClick={() => deleteTemplate(t)} aria-label="Delete template" className="shrink-0 p-1.5 text-slate-400 active:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Save this day as a template</p>
                {savable.length === 0 ? (
                  <p className="text-xs text-slate-400">Add some one-off events to this day first.</p>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); saveTemplate() }} className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Name, e.g. Weekday (${savable.length} events)`}
                      className="flex-1 min-w-0 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-400 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={saving || !name.trim()}
                      aria-label="Save template"
                      className="shrink-0 w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
