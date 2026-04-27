'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

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
  onSave: () => void
  onClose: () => void
}) {
  if (!open) return null

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
          placeholder="Enter amount"
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
            Cancel
          </Button>
          <Button
            onClick={onSave}
            className="flex-1 bg-violet-600"
            disabled={amount === '' || Number(amount) < 0}
          >
            Save Budget
          </Button>
        </div>
      </div>
    </div>
  )
}
