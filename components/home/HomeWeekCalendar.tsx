'use client'

import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HomeWeekCalendar() {
  const today    = new Date()
  const todayIdx = today.getDay()

  return (
    <div className="px-4 mt-5">
      <div className="flex justify-between items-center gap-1">
        {DAYS.map((day, i) => {
          const d = new Date(today)
          d.setDate(today.getDate() - todayIdx + i)
          const dayNum  = d.getDate()
          const isToday = i === todayIdx

          return (
            <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-wide',
                isToday ? 'text-violet-500' : 'text-muted-foreground'
              )}>
                {day}
              </span>
              <div className={cn(
                'w-full aspect-square max-w-[40px] rounded-xl flex items-center justify-center text-sm font-black transition-all',
                isToday
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40'
                  : 'bg-muted/50 text-foreground'
              )}>
                {dayNum}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
