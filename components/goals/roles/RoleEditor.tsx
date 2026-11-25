'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  NEEDS_UPDATE, ROLE_COLORS, ROLE_EMOJIS, ROLE_GUIDE, ROLE_SOFT_LIMIT, ROLE_SUGGESTIONS, isMissingRoles,
  sortCategories, suggestedCategoryId, tooManyRoles,
  type Role, type RoleCategory,
} from '@/lib/roles'

interface Props {
  open: boolean
  role: Role | null              // null: a new role
  userId: string
  activeCount: number            // roles you already have (not archived)
  existingNames: string[]
  categories: RoleCategory[]
  initialCategoryId?: string | null  // when adding from inside a category
  onClose: () => void
  onSaved: (role: Role) => void
}

const fieldCls = 'w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20'
const labelCls = 'text-[11px] font-black uppercase tracking-widest text-muted-foreground'

export default function RoleEditor({ open, role, userId, activeCount, existingNames, categories, initialCategoryId, onClose, onSaved }: Props) {
  const { tr } = useTranslation()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(ROLE_EMOJIS[0])
  const [color, setColor] = useState(ROLE_COLORS[0])
  const [mission, setMission] = useState('')
  const [vision, setVision] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(role?.name ?? '')
    setEmoji(role?.emoji ?? ROLE_EMOJIS[0])
    setColor(role?.color ?? ROLE_COLORS[activeCount % ROLE_COLORS.length])
    setMission(role?.mission ?? '')
    setVision(role?.vision ?? '')
    setCategoryId(role ? role.category_id ?? null : initialCategoryId ?? null)
  }, [open, role, activeCount, initialCategoryId])

  const isNew = !role
  const taken = new Set(existingNames.map(n => n.toLowerCase()))
  const cats = sortCategories(categories)
  const chosen = cats.find(c => c.id === categoryId)
  // Suggestions for the chosen category first (all of them when none is chosen)
  const suggestions = ROLE_SUGGESTIONS
    .filter(s => !taken.has(s.name.toLowerCase()))
    .filter(s => !chosen || s.category.toLowerCase() === chosen.name.toLowerCase())

  const save = async () => {
    const clean = name.trim()
    if (!clean) return
    setSaving(true)
    const values = {
      name: clean.slice(0, 60),
      emoji,
      color,
      mission: mission.trim() || null,
      vision: vision.trim() || null,
      updated_at: new Date().toISOString(),
      // Only sent when there are categories, so roles still save without them
      ...(cats.length ? { category_id: categoryId } : {}),
    }
    const supabase = createClient()
    const res = isNew
      ? await supabase.from('roles').insert({ ...values, owner_id: userId, sort_order: activeCount }).select('*').single()
      : await supabase.from('roles').update(values).eq('id', role.id).select('*').single()
    setSaving(false)
    if (res.error || !res.data) {
      toast.error(isMissingRoles(res.error?.message) ? NEEDS_UPDATE : tr('Couldn\'t save the role. Try again.'))
      return
    }
    toast.success(isNew ? tr('{clean} added', { clean: clean }) : tr('Role saved'))
    onSaved(res.data as Role)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90svh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="font-black text-xl tracking-tight">{isNew ? tr('New role') : tr('Edit {name}', { name: role.name })}</DialogTitle>
          <DialogDescription>{tr('A role is a part of life you are responsible for. Begin with the end in mind.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {cats.length > 0 && (
            <div className="space-y-1.5">
              <span className={labelCls}>{tr('Category')}</span>
              <div className="flex flex-wrap gap-1.5">
                {cats.map(c => (
                  <button key={c.id} type="button" onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                    className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                      categoryId === c.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-border bg-muted/40 text-muted-foreground')}>
                    {c.emoji} {tr(c.name)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="role-name" className={labelCls}>{tr('Role')}</label>
            <div className="flex gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${color}22` }}>{emoji}</span>
              <input id="role-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={tr('e.g. Father, Disciple, Entrepreneur')} className={fieldCls} />
            </div>
            {isNew && !name.trim() && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map(s => (
                  <button key={s.name} type="button" onClick={() => { setName(s.name); setEmoji(s.emoji); setCategoryId(id => id ?? suggestedCategoryId(s.name, cats)) }} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                    {s.emoji} {tr(s.name)}
                  </button>
                ))}
              </div>
            )}
            {isNew && tooManyRoles(activeCount + 1) && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {tr('That would be {value} roles. Covey suggests about {ROLE_SOFT_LIMIT}, so each one gets real attention. Consider joining two.', { value: activeCount + 1, ROLE_SOFT_LIMIT: ROLE_SOFT_LIMIT })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className={labelCls}>{tr('Icon and colour')}</span>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={tr('Icon {e}', { e: e })}
                  className={cn('grid h-9 w-9 place-items-center rounded-lg border text-base', emoji === e ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40' : 'border-transparent bg-muted/50')}>
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              {ROLE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={tr('Colour {c}', { c: c })}
                  className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-background', color === c && 'ring-2 ring-foreground/60')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {(['mission', 'vision'] as const).map(field => {
            const g = ROLE_GUIDE[field]
            const value = field === 'mission' ? mission : vision
            const set = field === 'mission' ? setMission : setVision
            return (
              <div key={field} className="space-y-1.5">
                <label htmlFor={`role-${field}`} className={labelCls}>
                  {field === 'mission' ? tr('Mission in this role') : tr('Vision for this role')} <span className="font-medium normal-case tracking-normal">{tr('(optional)')}</span>
                </label>
                <p className="text-sm font-semibold">{tr(g.question)}</p>
                <textarea id={`role-${field}`} value={value} onChange={e => set(e.target.value)} maxLength={1000} rows={3}
                  placeholder={tr(g.example)} className={cn(fieldCls, 'resize-y font-serif text-[15px] leading-relaxed')} />
                {!value.trim() && (
                  <button type="button" onClick={() => set(g.starter)} className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                    {tr('Start with: “{starter}”', { starter: g.starter })}
                  </button>
                )}
                {/_{3,}/.test(value) && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{tr('Fill in the blanks (___) with your own words.')}</p>}
              </div>
            )
          })}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-border text-sm font-semibold">{tr('Cancel')}</button>
          <button onClick={save} disabled={saving || !name.trim()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? tr('Add role') : tr('Save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
