'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDownCircle, ArrowUpCircle, X, Trash2 } from 'lucide-react'
import MoneyCategorySelector from './MoneyCategorySelector'
import { MoneyEntry } from '@/lib/types'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'

export default function MoneyEditModal({
  entry,
  onClose,
  onUpdated,
  onDeleted,
}: {
  entry: MoneyEntry | null
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
    if (!title || !amount || !categoryId || !date || !entry) {
      toast.error(t.money.fillAllFields)
      return
    }

    const { error } = await supabase
      .from('money_entries')
      .update({
        title,
        amount: Number(amount),
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
    
    onUpdated()
    onClose()
  }

  async function handleDelete() {
    if (!entry) return

    const { error } = await supabase
      .from('money_entries')
      .delete()
      .eq('id', entry.id)

    if (error) {
      toast.error(t.error, {
        description: error.message
      })
      return
    }

    toast.success(t.money.deleteSuccess)
    
    onDeleted()
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

        <h3 className="text-lg font-bold">Edit Entry</h3>

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
            Expense
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
            Income
          </Button>
        </div>

        {/* TITLE */}
        <Input
          placeholder="What for"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* AMOUNT */}
        <Input
          type="number"
          placeholder="Amount"
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

        {/* DELETE CONFIRMATION */}
        {showDeleteConfirm && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 mb-3 font-medium">
              Are you sure you want to delete this entry?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4"
          >
            <Trash2 size={16} />
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            className="flex-1 bg-violet-600"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
