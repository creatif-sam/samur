'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CloudSun } from 'lucide-react'

interface HomeHeaderProps {
  userName?: string | null
}

export default function HomeHeader({ userName }: HomeHeaderProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const {
    year,
    daysGone,
    desktopDays,
    mobileDays,
    countdown,
  } = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

    const goneMs = now.getTime() - start.getTime()
    const daysGone =
      Math.floor(goneMs / (1000 * 60 * 60 * 24)) + 1

    const remainingMs = Math.max(end.getTime() - now.getTime(), 0)

    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((remainingMs / (1000 * 60)) % 60)
    const seconds = Math.floor((remainingMs / 1000) % 60)

    const desktopBase = new Date(now)
    desktopBase.setDate(now.getDate() - 3)

    const desktopDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(desktopBase)
      d.setDate(desktopBase.getDate() + i)
      return d
    })

    const mobileBase = new Date(now)
    mobileBase.setDate(now.getDate() - 1)

    const mobileDays = Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(mobileBase)
      d.setDate(mobileBase.getDate() + i)
      return d
    })

    return {
      year: now.getFullYear(),
      daysGone,
      desktopDays,
      mobileDays,
      countdown: { days, hours, minutes, seconds },
    }
  }, [now])

  function isToday(d: Date) {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            Today
          </h1>
          <p className="text-sm text-muted-foreground">
            Stay intentional{userName ? `, ${userName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl px-4 py-2 bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-sm">
          <CloudSun className="h-5 w-5 opacity-90" />
          <div className="text-right">
            <div className="text-sm font-semibold">
              28°C
            </div>
            <div className="text-xs opacity-90">
              Partly cloudy
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button className="p-2 rounded-lg border">
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 sm:hidden">
            {mobileDays.map(day => {
              const active = isToday(day)
              return (
                <div
                  key={day.toDateString()}
                  className={`min-w-[56px] rounded-full px-3 py-2 text-center text-sm ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'border text-muted-foreground'
                  }`}
                >
                  <div className="text-xs opacity-80">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="font-semibold">
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden sm:flex gap-2">
            {desktopDays.map(day => {
              const active = isToday(day)
              return (
                <div
                  key={day.toDateString()}
                  className={`min-w-[56px] rounded-full px-3 py-2 text-center text-sm ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'border text-muted-foreground'
                  }`}
                >
                  <div className="text-xs opacity-80">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="font-semibold">
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button className="p-2 rounded-lg border">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="rounded-2xl border p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90">
              {year} progress
            </div>
            <div className="text-3xl font-bold leading-none">
              {daysGone}
            </div>
            <div className="text-xs opacity-80">
              days gone
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-extrabold leading-none">
              {countdown.days}
            </span>
            <span className="text-lg font-medium opacity-90">
              days
            </span>
            <span className="text-sm opacity-80">
              {countdown.hours}h {countdown.minutes}m {countdown.seconds}s left
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
