'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'

export default function BudgetEditModal({
  open,
  title,
  amount,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean
  title: string
  amount: string
  onChange: (v: string) => void
  onSave: () => void | Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  if (!open) return null

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-background w-[92%] max-w-md rounded-2xl p-4 space-y-4 mb-24 relative">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground"
        >
          <X size={18} />
        </button>

        {/* TITLE */}
        <div className="text-sm font-semibold text-center">
          {title}
        </div>

        {/* AMOUNT */}
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={t.money.enterAmount}
          value={amount}
          onChange={e => onChange(e.target.value)}
        />

        {/* ACTIONS */}
        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-violet-600"
            disabled={saving || amount === '' || !Number.isFinite(Number(amount)) || Number(amount) < 0}
          >
            {t.money.saveBudget}
          </Button>
        </div>
      </div>
    </div>
  )
}
