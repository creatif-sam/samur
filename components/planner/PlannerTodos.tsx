'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CalendarPlus, ChevronDown, ListTodo, Plus, Trash2 } from 'lucide-react'
import type { RoleLike } from '@/lib/planner/roleLinks'
import { isMissingRoles } from '@/lib/roles'

export type PlannerTodo = {
  id: string
  user_id: string
  text: string
  vision_id: string | null
  // Set for to-dos made from a goal or a big rock (after the planner roles update)
  role_id?: string | null
  goal_id?: string | null
  created_at: string
}

interface Props {
  userId: string | null
  visions: Record<string, { title: string; emoji: string }>
  roles?: Record<string, RoleLike>
  // Bumped by the parent after a to-do was scheduled (and removed), to reload
  refreshKey: number
  onSchedule: (todo: PlannerTodo) => void
}

// To-dos without a time yet. "Schedule" opens the event editor at the next free
// slot; once saved, the to-do is removed from this list.
export default function PlannerTodos({ userId, visions, roles = {}, refreshKey, onSchedule }: Props) {
  const { tr } = useTranslation()
  const supabase = createClient()
  const [todos, setTodos] = useState<PlannerTodo[]>([])
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  // The role for the next to-do (kept between adds, like a sticky filter)
  const [newRole, setNewRole] = useState<string | null>(null)
  const activeRoles = Object.values(roles).filter(r => !r.is_archived)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('planner_todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          // Table not created yet (migration pending): hide the section quietly
          console.error('Failed to load to-dos', error)
          setUnavailable(true)
          return
        }
        setTodos((data ?? []) as PlannerTodo[])
      })
  }, [userId, refreshKey])

  async function add() {
    const value = text.trim()
    if (!value || !userId) return
    setText('')
    const base: Record<string, string> = { user_id: userId, text: value }
    let { data, error } = await supabase
      .from('planner_todos')
      .insert(newRole ? { ...base, role_id: newRole } : base)
      .select()
      .single()
    // Before the planner roles update there is no role column: save it without
    if (error && newRole && isMissingRoles(error.message)) {
      ;({ data, error } = await supabase.from('planner_todos').insert(base).select().single())
    }
    if (error) {
      setText(value)
      toast.error(tr('Couldn\'t add the to-do. Check your connection.'))
      return
    }
    setTodos(t => [...t, data as PlannerTodo])
  }

  async function remove(todo: PlannerTodo) {
    setTodos(t => t.filter(x => x.id !== todo.id))
    const { error } = await supabase.from('planner_todos').delete().eq('id', todo.id)
    if (error) {
      setTodos(t => [...t, todo].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      toast.error(tr('Couldn\'t delete the to-do.'))
      return
    }
    toast.success(tr('To-do removed'), {
      action: {
        label: tr('Undo'),
        onClick: async () => {
          const { data } = await supabase
            .from('planner_todos')
            .insert({ id: todo.id, user_id: todo.user_id, text: todo.text, vision_id: todo.vision_id, created_at: todo.created_at, ...(todo.role_id ? { role_id: todo.role_id } : {}), ...(todo.goal_id ? { goal_id: todo.goal_id } : {}) })
            .select()
            .single()
          if (data) setTodos(t => [...t, data as PlannerTodo].sort((a, b) => a.created_at.localeCompare(b.created_at)))
        },
      },
    })
  }

  if (unavailable) return null

  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm p-4">
      <div className="flex items-center gap-1">
      <button onClick={() => setOpen(o => !o)} className="flex flex-1 items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5" />{' '}{tr('To-do')}{todos.length > 0 && ` · ${todos.length}`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <HelpTip topic="planner.todos" />
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <form
            onSubmit={(e) => { e.preventDefault(); add() }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tr('Something to do, no time yet…')}
              className="flex-1 min-w-0 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-400 dark:text-white"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label={tr('Add to-do')}
              className="shrink-0 w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Optional: which role the next to-do is for */}
          {activeRoles.length > 0 && (
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {activeRoles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setNewRole(newRole === r.id ? null : r.id)}
                  aria-pressed={newRole === r.id}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${newRole === r.id ? 'text-white' : 'border-slate-200 bg-white/60 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400'}`}
                  style={newRole === r.id ? { backgroundColor: r.color, borderColor: r.color } : undefined}
                >
                  {r.emoji ?? '🎯'} {tr(r.name)}
                </button>
              ))}
            </div>
          )}

          {todos.length === 0 ? (
            <p className="text-xs text-slate-400 px-1">{tr('Jot things down here, then schedule them into a free slot.')}</p>
          ) : (
            <ul className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {todos.map(todo => {
                const role = todo.role_id ? roles[todo.role_id] : null
                const vision = !todo.role_id && todo.vision_id ? visions[todo.vision_id] : null
                return (
                  <li key={todo.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">{todo.text}</p>
                      {role && <p className="flex items-center gap-1 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />{role.emoji} {tr(role.name)}</p>}
                      {vision && <p className="text-[10px] text-slate-400">{vision.emoji} {tr(vision.title)}</p>}
                    </div>
                    <button
                      onClick={() => onSchedule(todo)}
                      className="shrink-0 flex items-center gap-1 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 text-xs font-bold active:scale-95"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />{' '}{tr('Schedule')}
                    </button>
                    <button
                      onClick={() => remove(todo)}
                      aria-label={tr('Delete to-do')}
                      className="shrink-0 p-1.5 text-slate-400 active:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
