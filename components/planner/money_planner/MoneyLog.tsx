'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CurrencySelector from './CurrencySelector'
import MoneyAddModal from './MoneyAddModal'
import MoneyEditModal from './MoneyEditModal'
import { MoneyEntry } from '@/lib/types'
import { checkMonthlyBudgetAlerts } from '@/lib/money/checkMonthlyBudgetAlerts'
import { Pencil, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/contexts/TranslationContext'

type Scope = 'week' | 'month' | 'all'

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
  const initialDate = new Date()
  
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [symbol, setSymbol] = useState('₵')
  const [editingEntry, setEditingEntry] = useState<MoneyEntry | null>(null)
  const [scope, setScope] = useState<Scope>('all')
  const [month, setMonth] = useState(initialDate.getMonth())
  const [year, setYear] = useState(initialDate.getFullYear())
  const [weekOffset, setWeekOffset] = useState(0)

  const fetchEntries = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    let query = supabase
      .from('money_entries')
      .select('*, money_categories(name, icon)')
      .eq('user_id', user.id)

    // Apply date filtering based on scope
    if (scope === 'week') {
      const now = new Date()
      const base = new Date(now)
      base.setDate(now.getDate() - now.getDay() + weekOffset * 7)
      const start = new Date(base)
      const end = new Date(base)
      end.setDate(base.getDate() + 7)
      
      query = query
        .gte('entry_date', start.toISOString())
        .lt('entry_date', end.toISOString())
    } else if (scope === 'month') {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 1)
      
      query = query
        .gte('entry_date', start.toISOString())
        .lt('entry_date', end.toISOString())
    }

    const { data } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    setEntries(data ?? [])
    
    // Notify parent that entries have changed
    if (onEntriesChanged) {
      onEntriesChanged()
    }
  }, [month, onEntriesChanged, scope, supabase, weekOffset, year])

  useEffect(() => {
    void fetchEntries()
  }, [fetchEntries])

  function formatWeekRange(baseDate: Date, offset: number) {
    const start = new Date(baseDate)
    start.setDate(baseDate.getDate() - baseDate.getDay() + offset * 7)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const startLabel = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    const endLabel = end.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    return `${startLabel} to ${endLabel}`
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
            await checkMonthlyBudgetAlerts()
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

    // Sort entries by date and type
    const sortedEntries = [...entries].sort((a, b) => {
      const dateCompare = new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.type.localeCompare(b.type)
    })

    // Calculate totals
    const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0)
    const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
    const balance = totalIncome - totalExpense

    // Create CSV content with better formatting
    const csvRows: string[] = []
    
    // Title and Period
    csvRows.push(`"Money Log Export - ${new Date().toLocaleDateString()}"`)
    csvRows.push('')
    
    // Summary Section
    csvRows.push('"=== SUMMARY ==="')
    csvRows.push(`"Period:","${scope === 'all' ? 'All Time' : scope === 'week' ? weekLabel : `${new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}"`)
    csvRows.push(`"Total Income:","${symbol}${totalIncome.toFixed(2)}"`)
    csvRows.push(`"Total Expenses:","${symbol}${totalExpense.toFixed(2)}"`)
    csvRows.push(`"Balance:","${symbol}${balance.toFixed(2)}"`)
    csvRows.push(`"Total Entries:","${entries.length}"`)
    csvRows.push('')
    
    // Column Headers
    csvRows.push('"=== DETAILED TRANSACTIONS ==="')
    const headers = [t.money.date, t.money.title, t.money.category, t.money.type, `${t.money.amount} (${symbol})`]
    csvRows.push(headers.map(h => `"${h}"`).join(','))
    csvRows.push('') // Separator line

    // Income Entries
    const incomeEntries = sortedEntries.filter(e => e.type === 'income')
    if (incomeEntries.length > 0) {
      csvRows.push(`"--- ${t.money.income.toUpperCase()} ---"`)
      incomeEntries.forEach(entry => {
        const row = [
          new Date(entry.entry_date).toLocaleDateString(),
          entry.title.replace(/"/g, '""'),
          entry.money_categories?.name || 'Uncategorized',
          t.money.income,
          entry.amount.toFixed(2)
        ]
        csvRows.push(row.map(cell => `"${cell}"`).join(','))
      })
      csvRows.push(`"","","","${t.money.income} Total:","${totalIncome.toFixed(2)}"`)
      csvRows.push('')
    }

    // Expense Entries
    const expenseEntries = sortedEntries.filter(e => e.type === 'expense')
    if (expenseEntries.length > 0) {
      csvRows.push(`"--- ${t.money.expenses.toUpperCase()} ---"`)
      expenseEntries.forEach(entry => {
        const row = [
          new Date(entry.entry_date).toLocaleDateString(),
          entry.title.replace(/"/g, '""'),
          entry.money_categories?.name || 'Uncategorized',
          t.money.expense,
          entry.amount.toFixed(2)
        ]
        csvRows.push(row.map(cell => `"${cell}"`).join(','))
      })
      csvRows.push(`"","","","${t.money.expenses} Total:","${totalExpense.toFixed(2)}"`)
      csvRows.push('')
    }

    // Footer
    csvRows.push('')
    csvRows.push(`"Generated on:","${new Date().toLocaleString()}"`)
    csvRows.push(`"Currency:","${symbol}"`)

    const csvContent = csvRows.join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const periodLabel = scope === 'all' ? 'all' : scope === 'week' ? `week-${weekOffset}` : `${year}-${String(month + 1).padStart(2, '0')}`
    link.setAttribute('href', url)
    link.setAttribute('download', `money-log-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`)
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

  const totals = useMemo(() => {
    const income = entries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    
    const expense = entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)
    
    return { income, expense, balance: income - expense }
  }, [entries])

  const weekLabel = formatWeekRange(now, weekOffset)

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

      {/* SCOPE TOGGLE */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        {(['all', 'week', 'month'] as const).map(s => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => setScope(s)}
            className={`flex-1 rounded-lg capitalize ${
              scope === s
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground'
            }`}
          >
            {s === 'all' ? t.all : s === 'week' ? t.money.week : t.money.month}
          </Button>
        ))}
      </div>

      {/* DATE CONTROLS FOR WEEK */}
      {scope === 'week' && (
        <>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="flex-1"
            >
              {t.previous}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekOffset(0)}
              className="flex-1"
            >
              {t.planner.thisWeek}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="flex-1"
            >
              {t.next}
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {weekLabel}
          </div>
        </>
      )}

      {/* DATE CONTROLS FOR MONTH */}
      {scope === 'month' && (
        <div className="flex gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 border rounded-lg px-2 py-1 dark:bg-slate-900"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString(undefined, {
                  month: 'long',
                })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="flex-1 border rounded-lg px-2 py-1 dark:bg-slate-900"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = now.getFullYear() - i
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {/* TOTALS DISPLAY */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">
              {t.money.income}
            </div>
            <div className="text-sm font-bold text-green-700 dark:text-green-300 mt-1">
              {totals.income.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">
              {t.money.expenses}
            </div>
            <div className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">
              {totals.expense.toFixed(2)}
            </div>
          </div>
          
          <div className={`border rounded-lg p-3 ${
            totals.balance >= 0
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          }`}>
            <div className={`text-xs font-medium uppercase tracking-wide ${
              totals.balance >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {t.money.balance}
            </div>
            <div className={`text-sm font-bold mt-1 ${
              totals.balance >= 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}>
              {totals.balance.toFixed(2)}
            </div>
          </div>
        </div>
      )}

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
