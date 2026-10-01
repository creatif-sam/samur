'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { currencies } from '@/lib/currencies'

const DEFAULT_SYMBOL = '₵'

// Formats amounts with the currency chosen on the profile page.
// Whole numbers drop the decimals ("₵1,250"), others keep two ("₵12.50").
export function useMoneyFormat() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)

  useEffect(() => {
    const supabase = createClient()
    const loadSymbol = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_preferences')
        .select('currency')
        .eq('user_id', user.id)
        .maybeSingle()
      const c = currencies.find(x => x.code === data?.currency)
      if (c) setSymbol(c.symbol)
    }
    void loadSymbol()
  }, [])

  const format = useCallback(
    (amount: number) => {
      const rounded = Math.round(amount * 100) / 100
      const digits = Number.isInteger(rounded) ? 0 : 2
      const value = Math.abs(rounded).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
      return `${rounded < 0 ? '-' : ''}${symbol}${value}`
    },
    [symbol]
  )

  return { symbol, format }
}
