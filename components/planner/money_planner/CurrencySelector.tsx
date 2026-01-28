'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { currencies } from '@/lib/currencies'
import { Button } from '@/components/ui/button'

export default function CurrencySelector({
  onChange,
}: {
  onChange: (symbol: string) => void
}) {
  const supabase = createClient()
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    loadCurrency()
  }, [])

  async function loadCurrency() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('user_preferences')
      .select('currency')
      .eq('user_id', user.id)
      .single()

    if (data?.currency) {
      setCurrency(data.currency)
      const c = currencies.find(x => x.code === data.currency)
      if (c) onChange(c.symbol)
    }
  }

  async function updateCurrency(code: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('user_preferences').upsert({
      user_id: user.id,
      currency: code,
    })

    setCurrency(code)

    const c = currencies.find(x => x.code === code)
    if (c) onChange(c.symbol)
  }

  return (
    <div className="flex gap-2 overflow-x-auto">
      {currencies.map(c => (
        <Button
          key={c.code}
          size="sm"
          variant={currency === c.code ? 'default' : 'outline'}
          onClick={() => updateCurrency(c.code)}
        >
          {c.symbol} {c.code}
        </Button>
      ))}
    </div>
  )
}
