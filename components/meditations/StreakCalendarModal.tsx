'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  groupedByDay: Record<string, any[]>
  accountCreatedAt: string
}

function formatDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function StreakCalendarModal({
  open,
  onClose,
  groupedByDay,
  accountCreatedAt,
}: Props) {
  // Local state for active month remains the same
  const createdDate = new Date(accountCreatedAt)
  createdDate.setHours(0, 0, 0, 0)
  const currentYear = new Date().getFullYear()
  const createdMonth = startOfMonth(createdDate)
  const currentMonth = startOfMonth(new Date())
  const [activeMonth, setActiveMonth] = useState(currentMonth)

  const canGoPrev = activeMonth > createdMonth
  const canGoNext = activeMonth < currentMonth

  const monthDays = useMemo(() => {
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const copy = new Date(d)
      copy.setHours(0, 0, 0, 0)
      days.push(copy)
    }
    return days
  }, [activeMonth])

  const monthStreakCount = useMemo(() => {
    return monthDays.filter((d) => d >= createdDate && groupedByDay[formatDay(d)]).length
  }, [monthDays, groupedByDay, createdDate])

  const yearlyMeditationCount = useMemo(() => {
    return Object.keys(groupedByDay).filter((key) => {
      const date = new Date(key)
      date.setHours(0, 0, 0, 0)
      return date.getFullYear() === currentYear && date >= createdDate
    }).length
  }, [groupedByDay, createdDate, currentYear])

  const startOffset = monthDays[0].getDay()

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              // If the user drags down more than 100px, close it
              if (info.offset.y > 100) onClose()
            }}
            className="relative bg-background w-full max-w-lg rounded-t-3xl pt-2 px-6 shadow-2xl touch-none flex flex-col"
            style={{ 
              maxHeight: '85vh',
              /* extra bottom padding for navbar clearance */
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))'
            }}
          >
            {/* Pull Handle Indicator */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-4 flex-shrink-0" />

            {/* Scrollable area inside the draggable modal */}
            <div className="overflow-y-auto touch-pan-y pr-1">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  disabled={!canGoPrev}
                  onClick={() => canGoPrev && setActiveMonth(addMonths(activeMonth, -1))}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    !canGoPrev ? 'opacity-20 cursor-not-allowed' : 'text-primary hover:bg-muted'
                  }`}
                >
                  Prev
                </button>

                <div className="text-center">
                  <div className="font-bold text-lg">
                    {activeMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {monthStreakCount} days meditated
                  </div>
                </div>

                <button
                  disabled={!canGoNext}
                  onClick={() => canGoNext && setActiveMonth(addMonths(activeMonth, 1))}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    !canGoNext ? 'opacity-20 cursor-not-allowed' : 'text-primary hover:bg-muted'
                  }`}
                >
                  Next
                </button>
              </div>

              {/* Year summary */}
              <div className="mb-6 text-center text-xs text-muted-foreground/80 bg-muted/30 py-2 rounded-lg">
                ✨ <strong>{yearlyMeditationCount}</strong> sessions in {currentYear}
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 mb-4 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest">
                {WEEK_DAYS.map((d, i) => <div key={i}>{d}</div>)}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {monthDays.map((date) => {
                  const key = formatDay(date)
                  const entries = groupedByDay[key]
                  const isBeforeJoin = date < createdDate
                  const isJoinDay = formatDay(date) === formatDay(createdDate)
                  const done = Boolean(entries)
                  const hasMorning = Boolean(entries?.some((m) => m.period === 'morning'))
                  const hasEvening = Boolean(entries?.some((m) => m.period === 'evening'))
                  const today = new Date()
                  const isFuture = date > new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  const isMissed = !isBeforeJoin && !done && !isFuture && date < today

                  return (
                    <div key={key} className="flex justify-center">
                      <div
                        className={`relative h-10 w-10 rounded-full overflow-hidden flex flex-col items-center justify-center border-2
                          ${isBeforeJoin ? 'bg-green-50 border-green-100 text-green-600' : 'bg-muted border-transparent'}
                          ${isJoinDay ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                          ${done && !isBeforeJoin ? 'text-white' : ''}
                          ${isMissed ? 'bg-red-50 border-red-200' : ''}
                        `}
                      >
                        {!isBeforeJoin && (
                          <>
                            {hasMorning && (
                              <div className="absolute top-0 h-1/2 w-full bg-violet-500/90" />
                            )}
                            {hasEvening && (
                              <div className="absolute bottom-0 h-1/2 w-full bg-indigo-500/90" />
                            )}
                          </>
                        )}

                        <span className={`relative z-10 text-xs font-bold ${done && !isBeforeJoin ? 'text-white drop-shadow-sm' : ''}`}>
                          {date.getDate()}
                        </span>
                        {isMissed && (
                          <span className="relative z-10 text-[10px] -mt-0.5">😈</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[10px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5"><span className="text-sm">🔥</span><span>Meditated</span></div>
                <div className="flex items-center gap-1.5"><span className="text-sm">😈</span><span>Missed</span></div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-violet-500" />
                  <span>Morning only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
                  <span>Evening only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-3 w-3 overflow-hidden rounded-sm border border-muted-foreground/20">
                    <span className="h-full w-full bg-violet-500" />
                    <span className="h-full w-full bg-indigo-500" />
                  </span>
                  <span>Morning + Evening</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-200" />
                  <span>Pre-Join</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="mt-8 w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold active:scale-95 transition-transform"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}