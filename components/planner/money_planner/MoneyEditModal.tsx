'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import MoneyCategorySelector from './MoneyCategorySelector'
import { MoneyEntry } from '@/lib/types'
import { checkMonthlyBudgetAlerts } from '@/lib/money/checkMonthlyBudgetAlerts'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'

export default function MoneyEditModal({
  entry,
  onClose,
  onUpdated,
}: {
  entry: MoneyEntry | null
  onClose: () => void
  onUpdated: () => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setAmount(entry.amount.toString())
      setType(entry.type)
      setCategoryId(entry.category_id)
      setDate(entry.entry_date)
    }
  }, [entry])

  async function save() {
    if (saving) return
    const value = Number(amount)
    if (!title || !amount || !date || !entry) {
      toast.error(t.money.fillAllFields)
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t.money.invalidAmount)
      return
    }

    setSaving(true)
    try {
      await updateEntry(entry, value)
    } finally {
      setSaving(false)
    }
  }

  async function updateEntry(entry: MoneyEntry, value: number) {
    const { error } = await supabase
      .from('money_entries')
      .update({
        title,
        amount: value,
        type,
        category_id: categoryId,
        entry_date: date,
      })
      .eq('id', entry.id)

    if (error) {
      toast.error(t.error, {
        description: error.message
      })
      return
    }

    toast.success(t.money.updateSuccess)
    await checkMonthlyBudgetAlerts()
    
    onUpdated()
    onClose()
  }

  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="bg-background rounded-t-2xl p-4 w-full max-w-lg mx-auto space-y-4 relative mb-24 max-h-[85vh] overflow-y-auto">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold">{t.money.editEntry}</h3>

        {/* TYPE TABS */}
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <Button
            variant="ghost"
            onClick={() => setType('expense')}
            className={`flex-1 rounded-lg ${
              type === 'expense'
                ? 'bg-violet-600 text-white shadow'
                : 'text-muted-foreground'
            }`}
          >
            <ArrowDownCircle size={16} />
            {t.money.expense}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setType('income')}
            className={`flex-1 rounded-lg ${
              type === 'income'
                ? 'bg-violet-600 text-white shadow'
                : 'text-muted-foreground'
            }`}
          >
            <ArrowUpCircle size={16} />
            {t.money.income}
          </Button>
        </div>

        {/* TITLE */}
        <Input
          placeholder={t.money.title}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* AMOUNT */}
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={t.money.amount}
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        {/* DATE */}
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        {/* CATEGORY */}
        <MoneyCategorySelector
          value={categoryId}
          onChange={setCategoryId}
        />

        {/* ACTIONS */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-violet-600"
          >
            {t.money.saveChanges}
          </Button>
        </div>
      </div>
    </div>
  )
}
