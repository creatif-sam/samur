'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import MoneyLog from './MoneyLog'

import MoneyBudget from './MoneyBudget'
import MoneyCharts from './MoneyCharts'

type Tab = 'log' | 'charts' | 'budget'

export default function MoneyTabs() {
  const [tab, setTab] = useState<Tab>('log')
  const [open, setOpen] = useState(false)

  return (
    <div className="relative pb-24">
      {/* MONEY SUB TABS */}
      <div className="flex gap-2 rounded-xl bg-muted p-1 mb-4">
        <TabButton active={tab === 'log'} onClick={() => setTab('log')}>
          Log
        </TabButton>
        <TabButton active={tab === 'charts'} onClick={() => setTab('charts')}>
          Charts
        </TabButton>
        <TabButton active={tab === 'budget'} onClick={() => setTab('budget')}>
          Budget
        </TabButton>
      </div>

      {/* CONTENT */}
      {tab === 'log' && <MoneyLog open={open} setOpen={setOpen} />}
     {tab === 'charts' && <MoneyCharts />}
      {tab === 'budget' && <MoneyBudget />}

      {/* FLOATING PLUS */}
      {tab === 'log' && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-violet-600 text-white shadow-xl"
        >
          <Plus size={24} />
        </Button>
      )}
    </div>
  )
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`flex-1 rounded-lg ${
        active
          ? 'bg-background text-foreground shadow'
          : 'text-muted-foreground'
      }`}
    >
      {children}
    </Button>
  )
}
