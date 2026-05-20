'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { JSX, useEffect, useRef, useState } from 'react'
import {
  Home,
  Target,
  Calendar,
  Flame,
  BookOpen,
  NotebookPen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/contexts/TranslationContext'

const navItems = [
  { href: '/protected', key: 'home', icon: Home },
  { href: '/protected/goals', key: 'goals', icon: Target },
  { href: '/protected/note', key: 'note', icon: NotebookPen },
  { href: '/protected/readapp', key: 'readApp', icon: BookOpen },
  { href: '/protected/planner', key: 'planner', icon: Calendar },
  { href: '/protected/posts', key: 'posts', icon: Flame },
]

export function BottomNav(): JSX.Element {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [kbOffset, setKbOffset] = useState(0)
  const baseHeightRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Record the "keyboard-free" height as baseline
    baseHeightRef.current = window.innerHeight

    function onResize() {
      const h = window.innerHeight
      // Height increase → keyboard closed / orientation changed → update baseline
      if (h > baseHeightRef.current) {
        baseHeightRef.current = h
        setKbOffset(0)
        return
      }
      const diff = baseHeightRef.current - h
      // Threshold of 80px avoids false positives from browser chrome resizing
      setKbOffset(diff > 80 ? diff : 0)
    }

    // Reset baseline on orientation change after resize settles
    function onOrientationChange() {
      setTimeout(() => {
        baseHeightRef.current = window.innerHeight
        setKbOffset(0)
      }, 400)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrientationChange)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientationChange)
    }
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-violet-600 border-t border-violet-700 z-50 transition-transform duration-150 ease-out"
      style={{ transform: `translateY(${kbOffset}px)` }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-white text-violet-600'
                  : 'text-white hover:bg-violet-500'
              )}
            >
              <item.icon size={20} />

              <span className="text-xs mt-1">
                {t.nav[item.key as keyof typeof t.nav]}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

