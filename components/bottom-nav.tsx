'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { JSX } from 'react'
import {
  Home,
  Target,
  Calendar,
  Plus,
  BookOpen,
  NotebookPen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/contexts/TranslationContext'

const navItems = [
  { href: '/protected', key: 'home', icon: Home },           // Home (first)
  { href: '/protected/goals', key: 'goals', icon: Target },  // Goals
  { href: '/protected/note', key: 'note', icon: NotebookPen }, // Journal
  { href: '/protected/readapp', key: 'readApp', icon: BookOpen }, // Library
  { href: '/protected/planner', key: 'planner', icon: Calendar }, // Planner
  { href: '/protected/posts', key: 'posts', icon: Plus },    // Spirit
]

export function BottomNav(): JSX.Element {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-violet-600 border-t border-violet-700 z-50">
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
