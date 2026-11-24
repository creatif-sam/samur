'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NEEDS_UPDATE, isMissingRoles, sortCategories, type RoleCategory } from '@/lib/roles'

const EMOJIS = ['🙏', '🏠', '🤝', '💼', '❤️', '🏃', '🎓', '🌍', '🎨', '💰', '⛪', '⭐']

interface Props {
  open: boolean
  userId: string
  categories: RoleCategory[]
  roleCounts: Record<string, number>
  onClose: () => void
  onChange: (categories: RoleCategory[]) => void
}

// Add, rename, reorder and delete role categories. Deleting one keeps its roles.
export default function CategoryManager({ open, userId, categories, roleCounts, onClose, onChange }: Props) {
  const cats = sortCategories(categories)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState(EMOJIS[0])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fail = (msg?: string) => toast.error(isMissingRoles(msg) ? NEEDS_UPDATE : "Couldn't save the category")

  async function add() {
    const name = newName.trim().slice(0, 60)
    if (!name) return
    if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast.error('You already have that category'); return }
    setBusy(true)
    const { data, error } = await createClient().from('role_categories')
      .insert({ owner_id: userId, name, emoji: newEmoji, sort_order: cats.length }).select('*').single()
    setBusy(false)
    if (error || !data) return fail(error?.message)
    onChange([...categories, data as RoleCategory])
    setNewName('')
  }

  async function rename(cat: RoleCategory, value: string) {
    const name = value.trim().slice(0, 60)
    if (!name || name === cat.name) return
    const { data, error } = await createClient().from('role_categories').update({ name }).eq('id', cat.id).select('*').single()
    if (error || !data) return fail(error?.message)
    onChange(categories.map(c => (c.id === cat.id ? (data as RoleCategory) : c)))
  }

  async function setEmoji(cat: RoleCategory, emoji: string) {
    const { data, error } = await createClient().from('role_categories').update({ emoji }).eq('id', cat.id).select('*').single()
    if (error || !data) return fail(error?.message)
    onChange(categories.map(c => (c.id === cat.id ? (data as RoleCategory) : c)))
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= cats.length) return
    const order = [...cats]
    ;[order[index], order[j]] = [order[j], order[index]]
    const supabase = createClient()
    const results = await Promise.all(order.map((c, i) => supabase.from('role_categories').update({ sort_order: i }).eq('id', c.id).select('id')))
    if (results.some(r => r.error || !r.data?.length)) return fail()
    onChange(order.map((c, i) => ({ ...c, sort_order: i })))
  }

  async function remove(cat: RoleCategory) {
    setBusy(true)
    const { data, error } = await createClient().from('role_categories').delete().eq('id', cat.id).select('id')
    setBusy(false)
    setConfirming(null)
    if (error || !data?.length) return fail(error?.message)
    onChange(categories.filter(c => c.id !== cat.id))
    toast.success(`${cat.name} deleted. Its roles are under Other roles.`)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose() }}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90svh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="font-black text-xl tracking-tight">Role categories</DialogTitle>
          <DialogDescription>Group your roles into the big areas of life. Deleting a category keeps its roles.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {cats.map((c, i) => (
            <li key={c.id} className="rounded-2xl border border-border p-2.5">
              {/* The name gets the full width; the controls sit underneath */}
              <div className="flex items-center gap-2">
                <select value={c.emoji ?? ''} onChange={e => setEmoji(c, e.target.value)} aria-label="Icon" className="h-9 w-11 shrink-0 appearance-none rounded-lg border border-border bg-background text-center text-base">
                  {[...new Set([c.emoji ?? '', ...EMOJIS])].filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <input defaultValue={c.name} maxLength={60} aria-label="Category name" onBlur={e => rename(c, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold outline-none focus:border-border" />
              </div>
              <div className="mt-1 flex items-center justify-end gap-1">
                <span className="mr-auto pl-1 text-[11px] text-muted-foreground">{roleCounts[c.id] ? `${roleCounts[c.id]} role${roleCounts[c.id] === 1 ? '' : 's'}` : 'No roles yet'}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} aria-label="Move down" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => setConfirming(confirming === c.id ? null : c.id)} aria-label={`Delete ${c.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              {confirming === c.id && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs dark:bg-red-950/30">
                  <span>Delete {c.name}?{roleCounts[c.id] ? ` Its ${roleCounts[c.id]} role${roleCounts[c.id] === 1 ? '' : 's'} move to Other roles.` : ''}</span>
                  <button onClick={() => remove(c)} disabled={busy} className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white">Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={e => { e.preventDefault(); void add() }} className="flex gap-2">
          <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)} aria-label="Icon for the new category" className="h-10 shrink-0 rounded-xl border border-border bg-background px-1 text-base">
            {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={60} placeholder="New category, e.g. Health" className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-violet-400" />
          <button type="submit" disabled={busy || !newName.trim()} className="flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
