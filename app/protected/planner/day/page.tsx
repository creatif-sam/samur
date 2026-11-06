'use client'

import { HelpTip } from '@/components/ui/help-tip'
import React, { useState } from 'react'
import DailyPlanner from '@/components/planner/DailyPlanner'
import { Button } from '@/components/ui/button'
import { Clock, Wallet } from 'lucide-react'
import DailyMoneyPlanner from '@/components/planner/money_planner/page'

type PlanningMode = 'time' | 'money'

export default function DayPlannerPage(): React.JSX.Element {
  const [mode, setMode] = useState<PlanningMode>('time')

  return (
    // Changed to use 'text-foreground' for automatic theme text switching
    <div className="flex flex-col gap-4 px-3 pb-20 max-w-xl mx-auto text-foreground">
      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
        Daily Planning
        <HelpTip topic="planner.page" align="left" />
      </div>

      {/* bg-muted automatically handles light/dark background for the tab track */}
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

      {/* bg-background: Switches between white (light) and your dark hex (dark).
         border: Switches between light gray and dark gray borders.
      */}
      <div className="rounded-xl border bg-background p-3 flex justify-center transition-colors duration-300">
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
      className={`flex-1 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
        active
          ? 'bg-violet-600 text-white shadow-md' // Violet stays violet, text stays white for contrast
          : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground' 
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}