'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, BookOpen, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface DailyJournalModalProps {
  onClose: () => void
}

function getMonthSectionTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
}

function getPageTitle(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildJournalHtml(fields: {
  date: Date
  morningTime: string
  morningNotes: string
  tasks: string[]
  eveningConnections: string
  eveningMeals: string
  learned: Array<{ source: string; takeaway: string }>
  wins: [string, string, string]
  carryForward: string[]
}): string {
  const dateLabel = getPageTitle(fields.date)
  const SEP = '<p>━━━━━━━━━━━━━━━━━━━━━━━━</p>'

  const taskItems = fields.tasks.filter(t => t.trim())
  const taskList =
    taskItems.length > 0
      ? `<ul>${taskItems.map(t => `<li><p>${escHtml(t)}</p></li>`).join('')}</ul>`
      : `<ul><li><p></p></li></ul>`

  const learnedItems = fields.learned.filter(l => l.source.trim() || l.takeaway.trim())
  const learnedList =
    learnedItems.length > 0
      ? `<ul>${learnedItems
          .map(l => `<li><p>${escHtml(l.source)} → ${escHtml(l.takeaway)}</p></li>`)
          .join('')}</ul>`
      : `<ul><li><p></p></li></ul>`

  const carryItems = fields.carryForward.filter(c => c.trim())
  const carryList =
    carryItems.length > 0
      ? `<ul data-type="taskList">${carryItems
          .map(c => `<li data-type="taskItem" data-checked="false"><p>${escHtml(c)}</p></li>`)
          .join('')}</ul>`
      : `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`

  return [
    `<p><strong>📅 DATE: ${dateLabel}</strong></p>`,
    SEP,
    `<p><strong>🌅 MORNING</strong>&nbsp;&nbsp;(time: ${escHtml(fields.morningTime) || '___'})</p>`,
    SEP,
    fields.morningNotes
      ? `<p>${escHtml(fields.morningNotes).replace(/\n/g, '</p><p>')}</p>`
      : `<p></p>`,
    `<p></p>`,
    SEP,
    `<p><strong>💼 WORK &amp; RESPONSIBILITIES</strong></p>`,
    SEP,
    `<p>Tasks &amp; outcomes:</p>`,
    taskList,
    `<p></p>`,
    SEP,
    `<p><strong>🌇 EVENING</strong></p>`,
    SEP,
    `<p>Connections: ${escHtml(fields.eveningConnections)}</p>`,
    `<p>Meals: ${escHtml(fields.eveningMeals)}</p>`,
    `<p></p>`,
    SEP,
    `<p><strong>📖 WHAT I LEARNED TODAY</strong></p>`,
    SEP,
    `<p>Source → Takeaway:</p>`,
    learnedList,
    `<p></p>`,
    SEP,
    `<p><strong>✅ WINS (min. 3)</strong></p>`,
    SEP,
    `<ol>`,
    `<li><p>${escHtml(fields.wins[0])}</p></li>`,
    `<li><p>${escHtml(fields.wins[1])}</p></li>`,
    `<li><p>${escHtml(fields.wins[2])}</p></li>`,
    `</ol>`,
    `<p></p>`,
    SEP,
    `<p><strong>🔁 CARRY FORWARD</strong></p>`,
    SEP,
    carryList,
  ].join('\n')
}

const INPUT_CLS =
  'w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-base leading-snug ' +
  'focus:outline-none focus:ring-2 focus:ring-violet-500 ' +
  'placeholder:text-muted-foreground/40'

const LABEL_CLS = 'block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'

export default function DailyJournalModal({ onClose }: DailyJournalModalProps) {
  const today = new Date()

  const [isSaving, setIsSaving] = useState(false)
  const [morningTime, setMorningTime] = useState('')
  const [morningNotes, setMorningNotes] = useState('')
  const [tasks, setTasks] = useState<string[]>(['', ''])
  const [eveningConnections, setEveningConnections] = useState('')
  const [eveningMeals, setEveningMeals] = useState('')
  const [learned, setLearned] = useState([{ source: '', takeaway: '' }, { source: '', takeaway: '' }])
  const [wins, setWins] = useState<[string, string, string]>(['', '', ''])
  const [carryForward, setCarryForward] = useState<string[]>(['', ''])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not logged in'); return }

      const monthTitle = getMonthSectionTitle(today)
      const pageTitle = getPageTitle(today)

      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id')
        .eq('user_id', user.id)
        .ilike('title', 'Daily Journaling')
        .limit(1)

      let notebookId: string
      if (notebooks && notebooks.length > 0) {
        notebookId = notebooks[0].id
      } else {
        const { data: newNb, error: nbErr } = await supabase
          .from('notebooks')
          .insert({ user_id: user.id, title: 'Daily Journaling', emoji: '📔', color: '#7719aa' })
          .select('id')
          .single()
        if (nbErr) throw nbErr
        notebookId = newNb.id
      }

      const { data: sections } = await supabase
        .from('sections')
        .select('id')
        .eq('notebook_id', notebookId)
        .ilike('title', monthTitle)
        .limit(1)

      let sectionId: string
      if (sections && sections.length > 0) {
        sectionId = sections[0].id
      } else {
        const { data: newSect, error: sectErr } = await supabase
          .from('sections')
          .insert({ notebook_id: notebookId, title: monthTitle })
          .select('id')
          .single()
        if (sectErr) throw sectErr
        sectionId = newSect.id
      }

      const content = buildJournalHtml({
        date: today,
        morningTime,
        morningNotes,
        tasks,
        eveningConnections,
        eveningMeals,
        learned,
        wins,
        carryForward,
      })

      const { error: pageErr } = await supabase
        .from('pages')
        .insert({ section_id: sectionId, title: pageTitle, content })

      if (pageErr) throw pageErr

      toast.success('Journal entry saved to Daily Journaling!')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save journal entry')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
          <h2 className="text-sm font-black uppercase tracking-wider truncate">Journal My Day</h2>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white border-0 shrink-0 h-9"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
        </Button>
      </div>

      {/* Date banner */}
      <div className="px-4 py-2.5 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/30 shrink-0">
        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest text-center leading-snug">
          📅 {getPageTitle(today)}
        </p>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 5rem)' }}
      >
        <div className="w-full max-w-lg mx-auto px-4 divide-y divide-border">

          {/* MORNING */}
          <JSection emoji="🌅" title="MORNING">
            <label className={LABEL_CLS}>Time</label>
            <input
              type="time"
              value={morningTime}
              onChange={e => setMorningTime(e.target.value)}
              className={INPUT_CLS + ' mb-4'}
            />
            <label className={LABEL_CLS}>Notes</label>
            <textarea
              value={morningNotes}
              onChange={e => setMorningNotes(e.target.value)}
              placeholder="How did your morning start?"
              rows={3}
              className={
                'w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-base leading-snug resize-none ' +
                'focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-muted-foreground/40'
              }
            />
          </JSection>

          {/* WORK & RESPONSIBILITIES */}
          <JSection emoji="💼" title="WORK & RESPONSIBILITIES">
            <label className={LABEL_CLS}>Tasks &amp; Outcomes</label>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-sm shrink-0">–</span>
                  <input
                    type="text"
                    value={task}
                    onChange={e => {
                      const next = [...tasks]; next[i] = e.target.value; setTasks(next)
                    }}
                    placeholder={`Task ${i + 1}`}
                    className={INPUT_CLS + ' min-w-0'}
                  />
                  {tasks.length > 1 && (
                    <button
                      onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-muted-foreground active:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <AddButton onClick={() => setTasks([...tasks, ''])} label="Add task" />
          </JSection>

          {/* EVENING */}
          <JSection emoji="🌇" title="EVENING">
            <label className={LABEL_CLS}>Connections</label>
            <input
              type="text"
              value={eveningConnections}
              onChange={e => setEveningConnections(e.target.value)}
              placeholder="Who did you connect with?"
              className={INPUT_CLS + ' mb-4'}
            />
            <label className={LABEL_CLS}>Meals</label>
            <input
              type="text"
              value={eveningMeals}
              onChange={e => setEveningMeals(e.target.value)}
              placeholder="What did you eat?"
              className={INPUT_CLS}
            />
          </JSection>

          {/* WHAT I LEARNED TODAY */}
          <JSection emoji="📖" title="WHAT I LEARNED TODAY">
            <label className={LABEL_CLS}>Source → Takeaway</label>
            <div className="space-y-3">
              {learned.map((item, i) => (
                <div key={i} className="flex items-start gap-2 min-w-0">
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="text"
                      value={item.source}
                      onChange={e => {
                        const next = [...learned]; next[i] = { ...next[i], source: e.target.value }; setLearned(next)
                      }}
                      placeholder="Source"
                      className={INPUT_CLS}
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-muted-foreground text-sm shrink-0">→</span>
                      <input
                        type="text"
                        value={item.takeaway}
                        onChange={e => {
                          const next = [...learned]; next[i] = { ...next[i], takeaway: e.target.value }; setLearned(next)
                        }}
                        placeholder="Takeaway"
                        className={INPUT_CLS + ' min-w-0'}
                      />
                    </div>
                  </div>
                  {learned.length > 1 && (
                    <button
                      onClick={() => setLearned(learned.filter((_, idx) => idx !== i))}
                      className="shrink-0 mt-2 text-muted-foreground active:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <AddButton onClick={() => setLearned([...learned, { source: '', takeaway: '' }])} label="Add lesson" />
          </JSection>

          {/* WINS */}
          <JSection emoji="✅" title="WINS (min. 3)">
            {([0, 1, 2] as const).map(i => (
              <div key={i} className="flex items-center gap-2 min-w-0 mb-2">
                <span className="text-sm font-bold text-violet-500 w-5 shrink-0 text-right">{i + 1}.</span>
                <input
                  type="text"
                  value={wins[i]}
                  onChange={e => {
                    const next = [...wins] as [string, string, string]; next[i] = e.target.value; setWins(next)
                  }}
                  placeholder={`Win #${i + 1}`}
                  className={INPUT_CLS + ' min-w-0'}
                />
              </div>
            ))}
          </JSection>

          {/* CARRY FORWARD */}
          <JSection emoji="🔁" title="CARRY FORWARD">
            <div className="space-y-2">
              {carryForward.map((item, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-sm shrink-0 font-mono leading-none">[ ]</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => {
                      const next = [...carryForward]; next[i] = e.target.value; setCarryForward(next)
                    }}
                    placeholder={`Item ${i + 1}`}
                    className={INPUT_CLS + ' min-w-0'}
                  />
                  {carryForward.length > 1 && (
                    <button
                      onClick={() => setCarryForward(carryForward.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-muted-foreground active:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <AddButton onClick={() => setCarryForward([...carryForward, ''])} label="Add item" />
          </JSection>

        </div>
      </div>
    </div>
  )
}

function JSection({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="py-5">
      <div className="flex items-center gap-2 mb-4 min-w-0">
        <span className="text-lg shrink-0">{emoji}</span>
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground truncate">{title}</h3>
        <div className="flex-1 h-px bg-border" style={{ minWidth: 8 }} />
      </div>
      {children}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-violet-500 active:text-violet-700 transition-colors py-1"
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
