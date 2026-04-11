'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CurrencySelector from './CurrencySelector'
import MoneyAddModal from './MoneyAddModal'
import MoneyEditModal from './MoneyEditModal'
import { MoneyEntry } from '@/lib/types'
import { Pencil, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/contexts/TranslationContext'

type Grouped = {
  dateLabel: string
  total: number
  items: MoneyEntry[]
}

export default function MoneyLog({
  open,
  setOpen,
  onEntriesChanged,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  onEntriesChanged?: () => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()
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
    
    // Notify parent that entries have changed
    if (onEntriesChanged) {
      onEntriesChanged()
    }
  }

  async function deleteEntry(id: string, title: string) {
    // Show confirmation toast with action buttons
    toast.warning(t.money.deleteConfirm.replace('{title}', title), {
      description: t.money.deleteWarning,
      action: {
        label: t.delete,
        onClick: async () => {
          const { error } = await supabase.from('money_entries').delete().eq('id', id)
          
          if (error) {
            toast.error(t.error, {
              description: error.message
            })
          } else {
            toast.success(t.money.deleteSuccess)
            fetchEntries()
            // Notify parent that entries have changed
            if (onEntriesChanged) {
              onEntriesChanged()
            }
          }
        },
      },
      cancel: {
        label: t.cancel,
        onClick: () => {
          toast.dismiss()
        },
      },
      duration: 10000,
    })
  }

  function exportToExcel() {
    if (entries.length === 0) {
      toast.error(t.money.exportError)
      return
    }

    // Create CSV content
    const headers = [t.money.date, t.money.title, t.money.category, t.money.type, t.money.amount, t.money.currency]
    const csvRows = [headers.join(',')]

    entries.forEach(entry => {
      const row = [
        entry.entry_date,
        `"${entry.title.replace(/"/g, '""')}"`, // Escape quotes
        `"${entry.money_categories?.name || 'Uncategorized'}"`,
        entry.type === 'income' ? t.money.income : t.money.expense,
        entry.amount,
        symbol
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `money-log-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(t.money.exportSuccess, {
      description: `${entries.length} ${t.money.entriesExported}`
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
      {/* Header Actions */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1">
          <CurrencySelector onChange={setSymbol} />
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          size="sm"
          className="gap-2 rounded-lg"
          disabled={entries.length === 0}
        >
          <Download size={16} />
          <span className="hidden sm:inline">{t.money.export}</span>
        </Button>
      </div>

      {/* Entries List */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-sm font-medium">{t.money.noEntries}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.dateLabel}>
              {/* Date Header - Clean and minimal */}
              <div className="mb-3 px-1">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {group.dateLabel}
                </h3>
              </div>

              {/* Entries for this date */}
              <div className="space-y-2">
                {group.items.map(e => (
                  <div
                    key={e.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between p-3.5">
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {e.money_categories?.icon ?? '💰'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {e.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {e.money_categories?.name || 'Uncategorized'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount + Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`text-sm font-semibold ${
                          e.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {e.type === 'income' ? '+' : '-'}{symbol}{e.amount.toFixed(2)}
                        </div>
                        
                        {/* Action buttons - always visible */}
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => setEditingEntry(e)}
                            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteEntry(e.id, e.title)}
                            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
