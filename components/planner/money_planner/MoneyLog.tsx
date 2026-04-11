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

  // Calculate summary stats
  const summary = useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0
    entries.forEach(e => {
      if (e.type === 'income') totalIncome += e.amount
      else totalExpense += e.amount
    })
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense }
  }, [entries])

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1">
          <CurrencySelector onChange={setSymbol} />
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl font-semibold"
          disabled={entries.length === 0}
        >
          <Download size={16} />
          <span className="hidden sm:inline">{t.money.export}</span>
        </Button>
      </div>

      {/* Summary Cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800">
            <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
              {t.money.income}
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">
              {symbol}{summary.totalIncome.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-4 border border-red-100 dark:border-red-800">
            <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
              {t.money.expense}
            </div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">
              {symbol}{summary.totalExpense.toFixed(2)}
            </div>
          </div>
          
          <div className={`bg-gradient-to-br rounded-2xl p-4 border ${
            summary.balance >= 0 
              ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800' 
              : 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800'
          }`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
              summary.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
            }`}>
              {t.money.balance || 'Balance'}
            </div>
            <div className={`text-lg font-bold ${
              summary.balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
            }`}>
              {symbol}{Math.abs(summary.balance).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <span className="text-4xl">💰</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider">{t.money.noEntries}</p>
          <p className="text-xs mt-2">Start tracking your finances</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Date Header */}
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {group.dateLabel}
                </h3>
                {group.total > 0 && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                    -{symbol}{group.total.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Entries for this date */}
              <div className="space-y-2">
                {group.items.map(e => (
                  <div
                    key={e.id}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900 hover:shadow-lg transition-all"
                  >
                    {/* Colored accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      e.type === 'income' 
                        ? 'bg-gradient-to-b from-green-400 to-emerald-500' 
                        : 'bg-gradient-to-b from-red-400 to-rose-500'
                    }`} />

                    <div className="flex justify-between items-center p-4 pl-5">
                      <div className="flex gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          e.type === 'income'
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                          {e.money_categories?.icon ?? '💰'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-slate-800 dark:text-white mb-0.5">
                            {e.title}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {e.money_categories?.name || 'Uncategorized'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Amount */}
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
                            e.type === 'income'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {e.type === 'income' ? '+' : '-'}{symbol}{e.amount.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${
                            e.type === 'income'
                              ? 'text-green-500 dark:text-green-500'
                              : 'text-red-500 dark:text-red-500'
                          }`}>
                            {e.type === 'income' ? t.money.income : t.money.expense}
                          </div>
                        </div>
                        
                        {/* Action buttons - show on hover */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingEntry(e)}
                            className="p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 transition-colors"
                            aria-label="Edit entry"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteEntry(e.id, e.title)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={16} />
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
