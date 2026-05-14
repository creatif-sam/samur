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
import { cn } from '@/lib/utils'
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
  const [scope, setScope] = useState<Scope>('month')
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

    // Sort entries chronologically (oldest first)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    )

    const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`

    const csvRows: string[] = []

    // Column headers
    csvRows.push(['Date', 'Title', `Amount (${symbol})`, 'Type'].map(escape).join(','))

    // One row per entry
    sortedEntries.forEach(entry => {
      const row = [
        new Date(entry.entry_date).toLocaleDateString(),
        entry.title,
        entry.amount.toFixed(2),
        entry.type === 'income' ? 'Income' : 'Expense',
      ]
      csvRows.push(row.map(escape).join(','))
    })

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

  const weekLabel = formatWeekRange(new Date(), weekOffset)

  return (
    <div className="space-y-4 pb-4">

      {/* ── TOP BAR: Currency + Export ──────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <CurrencySelector onChange={setSymbol} />
        </div>
        <button
          onClick={exportToExcel}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all"
        >
          <Download size={14} />
          <span className="hidden sm:inline">{t.money.export}</span>
        </button>
      </div>

      {/* ── SCOPE TOGGLE ──────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {(['all', 'week', 'month'] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all',
              scope === s
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s === 'all' ? t.all : s === 'week' ? t.money.week : t.money.month}
          </button>
        ))}
      </div>

      {/* ── WEEK NAV ──────────────────────────────── */}
      {scope === 'week' && (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              ← {t.previous}
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              {t.planner.thisWeek}
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              {t.next} →
            </button>
          </div>
          <p className="text-center text-[10px] font-medium text-muted-foreground">{weekLabel}</p>
        </div>
      )}

      {/* ── MONTH / YEAR SELECTORS ──────────────────── */}
      {scope === 'month' && (
        <div className="flex gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 bg-muted/40 border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString(undefined, { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-24 bg-muted/40 border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = initialDate.getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      )}

      {/* ── SUMMARY HERO CARD ───────────────────────── */}
      {entries.length > 0 && (
        <div className={cn(
          'relative overflow-hidden rounded-3xl p-5 shadow-xl',
          totals.balance >= 0
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/30'
            : 'bg-gradient-to-br from-rose-600 to-red-700 shadow-red-900/30'
        )}>
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
            {scope === 'week' ? weekLabel : scope === 'month'
              ? `${new Date(year, month).toLocaleString(undefined, { month: 'long' })} ${year}`
              : 'All Time'
            } · Summary
          </p>

          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Net Balance</p>
                <p className="text-4xl font-black text-white leading-none">
                  {symbol}{Math.abs(totals.balance).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.income}</p>
                  <p className="text-lg font-black text-white">{symbol}{totals.income.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.expenses}</p>
                  <p className="text-lg font-black text-white">{symbol}{totals.expense.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-black text-white">
                {entries.length}
              </div>
              <p className="text-[9px] font-bold text-white/60 uppercase">entries</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ENTRIES ─────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-3xl">💰</div>
          <p className="text-sm font-bold">{t.money.noEntries}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.dateLabel}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                {group.dateLabel}
                <span className="ml-2 font-black text-foreground/60">{symbol}{group.total.toFixed(2)}</span>
              </p>

              <div className="space-y-2">
                {group.items.map(e => (
                  <div key={e.id} className="bg-muted/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-lg flex-shrink-0">
                      {e.money_categories?.icon ?? '💰'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-none truncate">{e.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {e.money_categories?.name ?? 'Uncategorized'}
                      </p>
                    </div>

                    <div className={cn(
                      'text-sm font-black flex-shrink-0',
                      e.type === 'income' ? 'text-emerald-500' : 'text-foreground'
                    )}>
                      {e.type === 'income' ? '+' : '-'}{symbol}{e.amount.toFixed(2)}
                    </div>

                    <div className="flex gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => setEditingEntry(e)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteEntry(e.id, e.title)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <MoneyAddModal open={open} onClose={() => setOpen(false)} onAdded={fetchEntries} />
      <MoneyEditModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onUpdated={fetchEntries}
        onDeleted={fetchEntries}
      />
    </div>
  )
}
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
              const y = initialDate.getFullYear() - i
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
