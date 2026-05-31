'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'

const PRAYER_PAGE = '/protected/posts'

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function FloatingPrayerTimer() {
  const pathname = usePathname()
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startTicking = () => {
    clearTick()
    const tick = () => {
      const saved = sessionStorage.getItem('prayer_timer')
      if (!saved) {
        setSecondsLeft(null)
        clearTick()
        return
      }
      try {
        const { endTime } = JSON.parse(saved)
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
        setSecondsLeft(remaining)
        if (remaining <= 0) {
          sessionStorage.removeItem('prayer_timer')
          setSecondsLeft(null)
          clearTick()
        }
      } catch {
        sessionStorage.removeItem('prayer_timer')
        setSecondsLeft(null)
        clearTick()
      }
    }
    tick()
    intervalRef.current = setInterval(tick, 500)
  }

  useEffect(() => {
    startTicking()
    return clearTick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync when tab becomes visible (user returns from background)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') startTicking()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-check sessionStorage whenever the route changes
  useEffect(() => {
    startTicking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Hide on the prayer page itself (no need to show there)
  if (pathname === PRAYER_PAGE) return null
  if (secondsLeft === null || secondsLeft <= 0) return null

  return (
    <button
      onClick={() => router.push(PRAYER_PAGE)}
      aria-label="Prayer timer running — tap to return"
      className="
        fixed top-3 left-1/2 -translate-x-1/2 z-[100]
        flex items-center gap-1.5
        bg-[#7719aa] text-white
        rounded-full px-3 py-1.5
        shadow-lg shadow-purple-900/40
        active:scale-95 transition-transform duration-150
        border border-purple-400/30
        backdrop-blur-sm
      "
    >
      <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse shrink-0" />
      <span className="text-[13px] font-black tabular-nums tracking-tight leading-none">
        {fmt(secondsLeft)}
      </span>
    </button>
  )
}
