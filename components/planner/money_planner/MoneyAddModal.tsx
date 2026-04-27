'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import MoneyCategorySelector from './MoneyCategorySelector'
import { checkMonthlyBudgetAlerts } from '@/lib/money/checkMonthlyBudgetAlerts'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'

export default function MoneyAddModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(today)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setAmount('')
      setType('expense')
      setCategoryId(null)
      setDate(today)
    }
  }, [open, today])

  async function save() {
    if (!title || !amount || !categoryId || !date) {
      toast.error(t.money.fillAllFields)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from('money_entries').insert({
      user_id: user.id,
      title,
      amount: Number(amount),
      type,
      category_id: categoryId,
      entry_date: date,
    })

    if (error) {
      toast.error(t.error, {
        description: error.message
      })
      return
    }

    const typeLabel = type === 'income' ? t.money.income : t.money.expense
    toast.success(t.money.addSuccess.replace('{type}', typeLabel), {
      description: `${title} - ${amount}`
    })

    await checkMonthlyBudgetAlerts()
    
    onAdded()
    onClose()
  }

  if (!open) return null

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
            className="flex-1 bg-violet-600"
          >
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
