'use client'

import React, { useState } from 'react'
import DailyPlanner from '@/components/planner/DailyPlanner'
import { Button } from '@/components/ui/button'
import { Clock, Wallet } from 'lucide-react'
import DailyMoneyPlanner from '@/components/planner/money_planner/page'

type PlanningMode = 'time' | 'money'

export default function DayPlannerPage(): React.JSX.Element {
  const [mode, setMode] = useState<PlanningMode>('time')

  return (
    <div className="flex flex-col gap-4 px-3 pb-20 max-w-xl mx-auto">
      <div className="text-lg font-semibold text-center">
        Daily Planning
      </div>

      <div className="flex gap-2 rounded-xl bg-muted p-1 justify-center">
        <TabButton
          active={mode === 'time'}
          onClick={() => setMode('time')}
          label="Time"
          icon={<Clock size={16} />}
        />
        <TabButton
          active={mode === 'money'}
          onClick={() => setMode('money')}
          label="Money"
          icon={<Wallet size={16} />}
        />
      </div>

      <div className="rounded-xl border bg-background p-3 flex justify-center">
        <div className="w-full">
          {mode === 'time' && <DailyPlanner />}

          {mode === 'money' && (
            <div className="text-sm text-muted-foreground text-center py-10">
              {mode === 'money' && <DailyMoneyPlanner />}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`flex-1 rounded-lg text-sm transition flex items-center justify-center gap-2 ${
        active
          ? 'bg-violet-600 text-white shadow'
          : 'bg-transparent text-muted-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}
