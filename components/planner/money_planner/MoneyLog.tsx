'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CurrencySelector from './CurrencySelector'
import MoneyAddModal from './MoneyAddModal'
import MoneyEditModal from './MoneyEditModal'
import { MoneyEntry } from '@/lib/types'
import { Pencil, Trash2 } from 'lucide-react'

type Grouped = {
  dateLabel: string
  total: number
  items: MoneyEntry[]
}

export default function MoneyLog({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const supabase = createClient()
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [symbol, setSymbol] = useState('₵')
  const [editingEntry, setEditingEntry] = useState<MoneyEntry | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('money_entries')
      .select('*, money_categories(name, icon)')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    setEntries(data ?? [])
  }

  async function deleteEntry(id: string) {
    await supabase.from('money_entries').delete().eq('id', id)
    fetchEntries()
  }

  const grouped = useMemo<Grouped[]>(() => {
    const map: Record<string, Grouped> = {}

    entries.forEach(e => {
      const d = new Date(e.entry_date)
      const label = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'long',
      })

      if (!map[label]) {
        map[label] = { dateLabel: label, total: 0, items: [] }
      }

      if (e.type === 'expense') {
        map[label].total += e.amount
      }

      map[label].items.push(e)
    })

    return Object.values(map)
  }, [entries])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CurrencySelector onChange={setSymbol} />

      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          No money activity today
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.dateLabel}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              <span>{group.dateLabel}</span>
              <span>
                Expenses {symbol}
                {group.total}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(e => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 12,
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        background: '#f3f3f3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {e.money_categories?.icon ?? '💰'}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <span style={{ fontSize: 12, opacity: 0.6 }}>
                          {e.money_categories?.name}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background:
                              e.type === 'income'
                                ? '#dcfce7'
                                : '#fee2e2',
                            color:
                              e.type === 'income'
                                ? '#166534'
                                : '#991b1b',
                            fontWeight: 500,
                          }}
                        >
                          {e.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color:
                          e.type === 'income'
                            ? '#16a34a'
                            : '#dc2626',
                        fontSize: 14,
                      }}
                    >
                      {symbol}
                      {e.amount}
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setEditingEntry(e)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                        }}
                        onMouseEnter={(ev) => ev.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteEntry(e.id)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                        }}
                        onMouseEnter={(ev) => ev.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <MoneyAddModal
        open={open}
        onClose={() => setOpen(false)}
        onAdded={fetchEntries}
      />

      <MoneyEditModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onUpdated={fetchEntries}
        onDeleted={fetchEntries}
      />
    </div>
  )
}
