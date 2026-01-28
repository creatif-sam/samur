import { createClient } from '@/lib/supabase/client'

const DEFAULT_CATEGORIES = [
  { name: 'Housing', icon: '🏠' },
  { name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { name: 'Faith', icon: '🙏' },
  { name: 'Food', icon: '🍽️' },
  { name: 'Personal Hygiene', icon: '🧼' },
]

export async function seedMoneyCategories(userId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('money_categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (data && data.length > 0) return

  await supabase.from('money_categories').insert(
    DEFAULT_CATEGORIES.map(c => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
    }))
  )
}
