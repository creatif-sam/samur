'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CurrencySelector from './CurrencySelector'
import MoneyAddModal from './MoneyAddModal'
import MoneyEditModal from './MoneyEditModal'
import { MoneyEntry } from '@/lib/types'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Grouped = {
  dateLabel: string
  total: number
  items: MoneyEntry[]
}

export default function MoneyLog({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const supabase = createClient()
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [symbol, setSymbol] = useState('₵')
  const [editingEntry, setEditingEntry] = useState<MoneyEntry | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('money_entries')
      .select('*, money_categories(name, icon)')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    setEntries(data ?? [])
  }

  async function deleteEntry(id: string, title: string) {
    // Show confirmation toast with action buttons
    toast.warning(`Delete "${title}"?`, {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          const { error } = await supabase.from('money_entries').delete().eq('id', id)
          
          if (error) {
            toast.error('Failed to delete entry', {
              description: error.message
            })
          } else {
            toast.success('Entry deleted successfully')
            fetchEntries()
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {
          toast.dismiss()
        },
      },
      duration: 10000,
    })
  }

  const grouped = useMemo<Grouped[]>(() => {
    const map: Record<string, Grouped> = {}

    entries.forEach(e => {
      const d = new Date(e.entry_date)
      const label = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'long',
      })

      if (!map[label]) {
        map[label] = { dateLabel: label, total: 0, items: [] }
      }

      if (e.type === 'expense') {
        map[label].total += e.amount
      }

      map[label].items.push(e)
    })

    return Object.values(map)
  }, [entries])

  return (
    <div className="flex flex-col gap-4">
      <CurrencySelector onChange={setSymbol} />

      {grouped.length === 0 ? (
        <div className="text-center opacity-60 dark:text-slate-400">
          No money activity today
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.dateLabel}>
            <div className="flex justify-between text-[13px] opacity-70 mb-2 dark:text-slate-400">
              <span>{group.dateLabel}</span>
              <span>
                Expenses {symbol}
                {group.total}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {group.items.map(e => (
                <div
                  key={e.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md dark:hover:border-slate-600 transition-all"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                      {e.money_categories?.icon ?? '💰'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap dark:text-white">
                        {e.title}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs opacity-60 dark:text-slate-400">
                          {e.money_categories?.name}
                        </span>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            e.type === 'income'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {e.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`font-semibold text-sm ${
                        e.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {symbol}
                      {e.amount}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingEntry(e)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                        aria-label="Edit entry"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteEntry(e.id, e.title)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <MoneyAddModal
        open={open}
        onClose={() => setOpen(false)}
        onAdded={fetchEntries}
      />

      <MoneyEditModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onUpdated={fetchEntries}
        onDeleted={fetchEntries}
      />
    </div>
  )
}
