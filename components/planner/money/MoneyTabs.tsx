'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import MoneyLog from './MoneyLog'

import MoneyBudget from './MoneyBudget'
import MoneyCharts from './MoneyCharts'
import { useTranslation } from '@/contexts/TranslationContext'

type Tab = 'log' | 'charts' | 'budget'

export default function MoneyTabs() {
  const [tab, setTab] = useState<Tab>('log')
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="relative pb-24">
      {/* MONEY SUB TABS */}
      <div className="mb-4 flex items-center gap-1">
      <div className="flex flex-1 gap-2 rounded-xl bg-muted p-1">
        <TabButton active={tab === 'log'} onClick={() => setTab('log')}>
          {t.money.log}
        </TabButton>
        <TabButton active={tab === 'charts'} onClick={() => setTab('charts')}>
          {t.money.charts}
        </TabButton>
        <TabButton active={tab === 'budget'} onClick={() => setTab('budget')}>
          {t.money.budget}
        </TabButton>
      </div>
      <HelpTip topic="planner.money" />
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
