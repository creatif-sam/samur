'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BudgetEditModal from './BudgetEditModal'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/contexts/TranslationContext'
import { checkMonthlyBudgetAlerts } from '@/lib/money/checkMonthlyBudgetAlerts'
import { formatWeekRange, toLocalDateKey, weekStart, yearOptions } from '@/lib/money/dates'
import { useMoneyFormat } from '@/lib/money/useMoneyFormat'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Scope = 'week' | 'month'

type MoneyCategory = {
  id: string
  name: string
  icon: string
}

type CategoryBudget = {
  id: string
  name: string
  icon: string
  budget: number
  spent: number
}

export default function MoneyBudget() {
  const supabase = createClient()
  const { t } = useTranslation()
  const { format } = useMoneyFormat()
  const now = new Date()

  const [scope, setScope] = useState<Scope>('month')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [weekOffset, setWeekOffset] = useState(0)

  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [totalInput, setTotalInput] = useState('')
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetModalTitle, setBudgetModalTitle] = useState('')
  const [budgetTarget, setBudgetTarget] =
    useState<'total' | string | null>(null)


  const [categories, setCategories] = useState<CategoryBudget[]>([])
  // All expenses in the period, including uncategorized ones
  const [spentTotal, setSpentTotal] = useState(0)
  const [categoryInput, setCategoryInput] = useState('')

  const periodStart =
    scope === 'month' ? new Date(year, month, 1) : weekStart(weekOffset)

  const periodEnd =
    scope === 'month' ? new Date(year, month + 1, 1) : weekStart(weekOffset + 1)
  const periodStartKey = toLocalDateKey(periodStart)
  const periodEndKey = toLocalDateKey(periodEnd)

  const loadBudgetState = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: budget, error: budgetError }, { data: baseCategories, error: categoriesError }] = await Promise.all([
      supabase
        .from('money_budget_periods')
        .select('id, total_budget')
        .eq('user_id', user.id)
        .eq('scope', scope)
        .eq('period_start', periodStartKey)
        .maybeSingle(),
      supabase
        .from('money_categories')
        .select('id, name, icon')
        .eq('user_id', user.id)
        .order('name'),
    ])

    if (budgetError) {
      toast.error(t.money.loadBudgetError, {
        description: budgetError.message,
      })
      return
    }

    if (categoriesError) {
      toast.error(t.money.loadBudgetError, {
        description: categoriesError.message,
      })
      return
    }

    setBudgetId(budget?.id ?? null)
    setTotalBudget(budget?.total_budget ?? null)

    const safeCategories = (baseCategories ?? []) as MoneyCategory[]

    if (!budget?.id) {
      setCategories(
        safeCategories.map(category => ({
          ...category,
          budget: 0,
          spent: 0,
        }))
      )
      return
    }

    const { data: allocations, error: allocationsError } = await supabase
      .from('money_budget_allocations')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('budget_period_id', budget.id)

    if (allocationsError) {
      toast.error(t.money.loadBudgetError, {
        description: allocationsError.message,
      })
      return
    }

    const allocationMap = new Map(
      (allocations ?? []).map(allocation => [
        allocation.category_id,
        allocation.amount,
      ])
    )

    setCategories(
      safeCategories.map(category => ({
        ...category,
        budget: allocationMap.get(category.id) ?? 0,
        spent: 0,
      }))
    )
  }, [periodStartKey, scope, supabase, t])

  const loadSpending = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('money_entries')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('entry_date', periodStartKey)
      .lt('entry_date', periodEndKey)

    const totals: Record<string, number> = {}
    let total = 0

    data?.forEach(e => {
      total += e.amount
      if (e.category_id) {
        totals[e.category_id] =
          (totals[e.category_id] ?? 0) + e.amount
      }
    })

    setSpentTotal(total)
    setCategories(prev =>
      prev.map(c => ({
        ...c,
        spent: totals[c.id] ?? 0,
      }))
    )
  }, [periodEndKey, periodStartKey, supabase])

  const loadData = useCallback(async () => {
    await loadBudgetState()
    await loadSpending()
  }, [loadBudgetState, loadSpending])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function saveTotalBudget() {
    const total = Number(totalInput)
    if (totalInput === '' || !Number.isFinite(total) || total < 0) return false

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const payload = {
      user_id: user.id,
      scope,
      period_start: periodStartKey,
      period_end: periodEndKey,
      total_budget: total,
    }

    const query = budgetId
      ? supabase
          .from('money_budget_periods')
          .update(payload)
          .eq('id', budgetId)
          .eq('user_id', user.id)
          .select('id, total_budget')
          .single()
      : supabase
          .from('money_budget_periods')
          .insert(payload)
          .select('id, total_budget')
          .single()

    const { data, error } = await query

    if (error) {
      toast.error(t.money.saveBudgetError, {
        description: error.message,
      })
      return false
    }

    setBudgetId(data.id)
    setTotalBudget(data.total_budget)
    setTotalInput('')
    await checkMonthlyBudgetAlerts()
    return true
  }

  async function saveCategoryBudget(categoryId: string) {
    const amount = Number(categoryInput)
    if (categoryInput === '' || !Number.isFinite(amount)) return false

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    let nextBudgetId = budgetId

    if (!nextBudgetId) {
      const { data: createdBudget, error: createdBudgetError } = await supabase
        .from('money_budget_periods')
        .insert({
          user_id: user.id,
          scope,
          period_start: periodStartKey,
          period_end: periodEndKey,
          total_budget: totalBudget ?? 0,
        })
        .select('id')
        .single()

      if (createdBudgetError) {
        toast.error(t.money.saveBudgetError, {
          description: createdBudgetError.message,
        })
        return false
      }

      nextBudgetId = createdBudget.id
      setBudgetId(createdBudget.id)
    }

    const query =
      amount <= 0
        ? supabase
            .from('money_budget_allocations')
            .delete()
            .eq('user_id', user.id)
            .eq('budget_period_id', nextBudgetId)
            .eq('category_id', categoryId)
        : supabase.from('money_budget_allocations').upsert(
            {
              user_id: user.id,
              budget_period_id: nextBudgetId,
              category_id: categoryId,
              amount,
            },
            {
              onConflict: 'budget_period_id,category_id',
            }
          )

    const { error } = await query

    if (error) {
      toast.error(t.money.saveBudgetError, {
        description: error.message,
      })
      return false
    }

    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId
          ? { ...c, budget: amount > 0 ? amount : 0 }
          : c
      )
    )

    setCategoryInput('')
    return true
  }

  const allocatedTotal = categories.reduce(
    (sum, category) => sum + category.budget,
    0
  )

  const hasBudget = totalBudget !== null && totalBudget > 0
  // Negative when overspent, so the card can say by how much
  const remaining = hasBudget ? totalBudget - spentTotal : 0
  const overspent = hasBudget && remaining < 0
  const unallocated = hasBudget ? totalBudget - allocatedTotal : 0

  const percent = hasBudget
    ? Math.max(0, Math.round((remaining / totalBudget) * 100))
    : 0

  return (
    <div className="space-y-4 pb-24">

      {/* ── SCOPE TOGGLE ──────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {(['week', 'month'] as const).map(s => (
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
            {s === 'week' ? t.money.week : t.money.month}
          </button>
        ))}
      </div>

      {/* ── WEEK NAVIGATION ───────────────────────── */}
      {scope === 'week' && (
        <>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWeekOffset(weekOffset - 1)} className="flex-1">
              {t.previous}
            </Button>
            <Button variant="outline" onClick={() => setWeekOffset(0)} className="flex-1">
              {t.planner.thisWeek}
            </Button>
            <Button variant="outline" onClick={() => setWeekOffset(weekOffset + 1)} className="flex-1">
              {t.next}
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {formatWeekRange(weekOffset, t.money.weekRange)}
          </div>
        </>
      )}

      {/* ── MONTH / YEAR SELECTORS ─────────────────── */}
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
            {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* ── HERO BUDGET CARD ──────────────────────── */}
      <div className={cn(
        'relative overflow-hidden rounded-3xl p-5 shadow-xl',
        !hasBudget
          ? 'bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-violet-900/30'
          : percent > 50
          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/30'
          : percent > 20
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-900/30'
          : 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/30'
      )}>
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
          {scope === 'week'
            ? t.money.week
            : `${new Date(year, month).toLocaleString(undefined, { month: 'long' })} ${year}`
          } · {t.money.budget}
        </p>

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">
                {overspent ? t.money.overBy : t.money.remaining}
              </p>
              <p className="text-4xl font-black text-white leading-none break-all">
                {hasBudget ? format(Math.abs(remaining)) : '—'}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.budget}</p>
                <p className="text-xl font-black text-white">{hasBudget ? format(totalBudget) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.spent}</p>
                <p className="text-xl font-black text-white">{format(spentTotal)}</p>
              </div>
            </div>
          </div>

          {/* Circular progress ring */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - percent / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-black text-white leading-none">{percent}%</p>
              <p className="text-[9px] font-bold text-white/50 uppercase">{t.money.left}</p>
            </div>
          </div>
        </div>

        {/* Allocation note */}
        {hasBudget && (
          <div className="mt-3 pt-3 border-t border-white/15 relative z-10">
            {unallocated < 0 ? (
              <p className="text-xs text-white/70 font-medium">⚠️ {t.money.overAllocated.replace('{amount}', format(Math.abs(unallocated)))}</p>
            ) : unallocated > 0 ? (
              <p className="text-xs text-white/60 font-medium">{t.money.unallocated.replace('{amount}', format(unallocated))}</p>
            ) : (
              <p className="text-xs text-white/60 font-medium">✓ {t.money.fullyAllocated}</p>
            )}
          </div>
        )}
      </div>

      {/* ── SET TOTAL BUDGET ──────────────────────── */}
      <button
        onClick={() => {
          setBudgetModalTitle(t.money.setTotalBudget)
          setBudgetTarget('total')
          setTotalInput(totalBudget?.toString() ?? '')
          setBudgetModalOpen(true)
        }}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-500/40 text-violet-500 text-sm font-bold hover:bg-violet-500/5 transition-all"
      >
        {hasBudget ? `✏️ ${t.money.setTotalBudget}` : `+ ${t.money.setTotalBudget}`}
      </button>

      {/* ── CATEGORY CARDS ────────────────────────── */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black tracking-tight px-1">{t.money.categories}</h3>
          {categories.map(c => {
            const ratio    = c.budget > 0 ? c.spent / c.budget : 0
            const barColor = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500'
            const overBudget = ratio >= 1
            const nearLimit  = ratio >= 0.8 && ratio < 1

            return (
              <div key={c.id} className="bg-muted/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-xl flex-shrink-0">
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(c.spent)} / {c.budget > 0 ? format(c.budget) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {overBudget && (
                      <span className="text-[10px] font-bold text-red-500">{t.money.overBudget}</span>
                    )}
                    {nearLimit && (
                      <span className="text-[10px] font-bold text-amber-500">{t.money.nearLimit}</span>
                    )}
                    <button
                      onClick={() => {
                        setBudgetModalTitle(`${t.money.setBudget} ${c.name}`)
                        setBudgetTarget(c.id)
                        setCategoryInput(c.budget.toString())
                        setBudgetModalOpen(true)
                      }}
                      className="text-[11px] font-bold text-violet-500 hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                    >
                      {c.budget > 0 ? t.edit : t.money.set}
                    </button>
                  </div>
                </div>

                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────── */}
      <BudgetEditModal
        open={budgetModalOpen}
        title={budgetModalTitle}
        amount={budgetTarget === 'total' ? totalInput : categoryInput}
        onChange={v =>
          budgetTarget === 'total' ? setTotalInput(v) : setCategoryInput(v)
        }
        onSave={async () => {
          const saved =
            budgetTarget === 'total'
              ? await saveTotalBudget()
              : budgetTarget
              ? await saveCategoryBudget(budgetTarget)
              : false
          if (saved) setBudgetModalOpen(false)
        }}
        onClose={() => setBudgetModalOpen(false)}
      />
    </div>
  )
}
