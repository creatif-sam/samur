'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CalendarPlus, ChevronDown, ListTodo, Plus, Trash2 } from 'lucide-react'

export type PlannerTodo = {
  id: string
  user_id: string
  text: string
  vision_id: string | null
  created_at: string
}

interface Props {
  userId: string | null
  visions: Record<string, { title: string; emoji: string }>
  // Bumped by the parent after a to-do was scheduled (and removed), to reload
  refreshKey: number
  onSchedule: (todo: PlannerTodo) => void
}

// To-dos without a time yet. "Schedule" opens the event editor at the next free
// slot; once saved, the to-do is removed from this list.
export default function PlannerTodos({ userId, visions, refreshKey, onSchedule }: Props) {
  const supabase = createClient()
  const [todos, setTodos] = useState<PlannerTodo[]>([])
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

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
    const { data, error } = await supabase
      .from('planner_todos')
      .insert({ user_id: userId, text: value })
      .select()
      .single()
    if (error) {
      setText(value)
      toast.error("Couldn't add the to-do. Check your connection.")
      return
    }
    setTodos(t => [...t, data as PlannerTodo])
  }

  async function remove(todo: PlannerTodo) {
    setTodos(t => t.filter(x => x.id !== todo.id))
    const { error } = await supabase.from('planner_todos').delete().eq('id', todo.id)
    if (error) {
      setTodos(t => [...t, todo].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      toast.error("Couldn't delete the to-do.")
      return
    }
    toast.success('To-do removed', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { data } = await supabase
            .from('planner_todos')
            .insert({ id: todo.id, user_id: todo.user_id, text: todo.text, vision_id: todo.vision_id, created_at: todo.created_at })
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
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5" /> To-do{todos.length > 0 && ` · ${todos.length}`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <form
            onSubmit={(e) => { e.preventDefault(); add() }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Something to do, no time yet…"
              className="flex-1 min-w-0 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-400 dark:text-white"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Add to-do"
              className="shrink-0 w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {todos.length === 0 ? (
            <p className="text-xs text-slate-400 px-1">Jot things down here, then schedule them into a free slot.</p>
          ) : (
            <ul className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {todos.map(todo => {
                const vision = todo.vision_id ? visions[todo.vision_id] : null
                return (
                  <li key={todo.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">{todo.text}</p>
                      {vision && <p className="text-[10px] text-slate-400">{vision.emoji} {vision.title}</p>}
                    </div>
                    <button
                      onClick={() => onSchedule(todo)}
                      className="shrink-0 flex items-center gap-1 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 text-xs font-bold active:scale-95"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" /> Schedule
                    </button>
                    <button
                      onClick={() => remove(todo)}
                      aria-label="Delete to-do"
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
