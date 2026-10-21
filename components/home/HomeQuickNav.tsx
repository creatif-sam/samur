'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BookOpen, BarChart2, ClipboardList, HandHeart, LucideIcon } from 'lucide-react'

interface QuickLink {
  label: string
  href: string
  icon: LucideIcon
  color: string
}

// Only places not already in the bottom nav
const quickLinks: QuickLink[] = [
  { label: 'Analytics', href: '/protected/analytics',        icon: BarChart2,     color: 'bg-rose-500'   },
  { label: 'Review',    href: '/protected/planner/review',   icon: ClipboardList, color: 'bg-teal-500'   },
  { label: 'Bible',     href: '/protected/bible',            icon: BookOpen,      color: 'bg-violet-500' },
  { label: 'Prayer',    href: '/protected/posts?tab=prayer', icon: HandHeart,     color: 'bg-amber-500'  },
]

export default function HomeQuickNav() {
  return (
    <div className="mt-5 px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {quickLinks.map(({ label, href, icon: Icon, color }) => (
          <Link key={href} href={href} className="flex-shrink-0">
            <div className="flex flex-col items-center gap-1.5 w-16">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground text-center leading-tight">
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
