import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal, DbGoalCategory, GoalView } from '@/lib/types'

export function useGoals() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<DbGoalCategory[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)

    const [gRes, cRes] = await Promise.all([
      supabase.from('goals').select('*, goal_categories(*)').or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`).order('created_at', { ascending: false }),
      supabase.from('goal_categories').select('*').eq('user_id', user.id)
    ])

    setGoals(gRes.data ?? [])
    setCategories(cRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  return {
    goals,
    setGoals,
    categories,
    loading,
    refresh: loadData
  }
}