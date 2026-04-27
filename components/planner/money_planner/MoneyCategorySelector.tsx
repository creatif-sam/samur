'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { seedMoneyCategories } from '@/lib/seedMoneyCategories'
import { useTranslation } from '@/contexts/TranslationContext'
import { toast } from 'sonner'

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
  onChange: (id: string | null) => void
}) {
  const supabase = createClient()
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💰')
  const [editingCategoryId, setEditingCategoryId] =
    useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingIcon, setEditingIcon] = useState('💰')

  const loadCategories = useCallback(async () => {
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
  }, [supabase])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  async function addCategory() {
    if (!newName.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('money_categories')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        icon: newIcon,
      })
      .select('id, name, icon')
      .single()

    if (error) {
      toast.error('Failed to add category', {
        description: error.message,
      })
      return
    }

    if (!data) return

    setCategories(prev => [...prev, data])
    setNewName('')
    setNewIcon('💰')
    onChange(data.id)
  }

  function startEditing(category: Category) {
    setEditingCategoryId(category.id)
    setEditingName(category.name)
    setEditingIcon(category.icon)
  }

  function cancelEditing() {
    setEditingCategoryId(null)
    setEditingName('')
    setEditingIcon('💰')
  }

  async function saveCategoryEdit() {
    if (!editingCategoryId || !editingName.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('money_categories')
      .update({
        name: editingName.trim(),
        icon: editingIcon,
      })
      .eq('id', editingCategoryId)
      .eq('user_id', user.id)
      .select('id, name, icon')
      .single()

    if (error) {
      toast.error('Failed to update category', {
        description: error.message,
      })
      return
    }

    if (!data) return

    setCategories(prev =>
      prev.map(c => (c.id === data.id ? data : c))
    )

    cancelEditing()
    toast.success('Category updated')
  }

  async function deleteCategory(category: Category) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { count, error: countError } = await supabase
      .from('money_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_id', category.id)

    if (countError) {
      toast.error('Failed to verify category usage', {
        description: countError.message,
      })
      return
    }

    if ((count ?? 0) > 0) {
      const { error: unlinkError } = await supabase
        .from('money_entries')
        .update({ category_id: null })
        .eq('user_id', user.id)
        .eq('category_id', category.id)

      if (unlinkError) {
        toast.error('Failed to detach costs from category', {
          description: unlinkError.message,
        })
        return
      }
    }

    const { error } = await supabase
      .from('money_categories')
      .delete()
      .eq('id', category.id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to delete category', {
        description: error.message,
      })
      return
    }

    setCategories(prev => prev.filter(c => c.id !== category.id))
    if (value === category.id) {
      onChange(null)
    }
    toast.success('Category deleted', {
      description:
        (count ?? 0) > 0
          ? 'Existing costs were moved to Uncategorized.'
          : undefined,
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={value === null ? 'default' : 'outline'}
          onClick={() => onChange(null)}
          className="flex items-center gap-1"
        >
          <span>❔</span>
          <span>Uncategorized</span>
        </Button>

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

      <div className="space-y-2 border rounded-lg p-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Manage categories
        </div>

        {categories.map(c => (
          <div
            key={`manage-${c.id}`}
            className="flex items-center justify-between gap-2"
          >
            {editingCategoryId === c.id ? (
              <div className="flex-1 flex items-center gap-2">
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={editingIcon}
                  onChange={e => setEditingIcon(e.target.value)}
                >
                  {ICONS.map(i => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <Input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  className="h-8"
                />
                <Button size="sm" onClick={saveCategoryEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEditing}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <>
                <div className="text-sm flex items-center gap-2">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEditing(c)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => deleteCategory(c)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </>
            )}
          </div>
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
