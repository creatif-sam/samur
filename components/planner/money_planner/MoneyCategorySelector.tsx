'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { seedMoneyCategories } from '@/lib/seedMoneyCategories'
import { useTranslation } from '@/contexts/TranslationContext'

type Category = {
  id: string
  name: string
  icon: string
}

const ICONS = ['🏠', '👨‍👩‍👧‍👦', '🙏', '🍽️', '🧼', '🚗', '🎓', '🎁', '💊', '💰']

export default function MoneyCategorySelector({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string) => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💰')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await seedMoneyCategories(user.id)

    const { data } = await supabase
      .from('money_categories')
      .select('id, name, icon')
      .eq('user_id', user.id)
      .order('name')

    const safeCategories =
      data?.filter(
        (c): c is Category =>
          Boolean(c && c.id && c.name && c.icon)
      ) ?? []

    setCategories(safeCategories)
  }

  async function addCategory() {
    if (!newName.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('money_categories')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        icon: newIcon,
      })
      .select('id, name, icon')
      .single()

    if (!data) return

    setCategories(prev => [...prev, data])
    setNewName('')
    setNewIcon('💰')
    onChange(data.id)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <Button
            key={c.id}
            size="sm"
            variant={value === c.id ? 'default' : 'outline'}
            onClick={() => onChange(c.id)}
            className="flex items-center gap-1"
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </Button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder={t.planner.newCategory}
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />

        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={newIcon}
          onChange={e => setNewIcon(e.target.value)}
        >
          {ICONS.map(i => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <Button onClick={addCategory}>
          <Plus size={16} />
        </Button>
      </div>
    </div>
  )
}
