'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Target, Calendar, BookOpen, NotebookPen, BarChart2, Moon, ClipboardList, LucideIcon } from 'lucide-react'

interface QuickLink {
  label: string
  href: string
  icon: LucideIcon
  color: string
}

const quickLinks: QuickLink[] = [
  { label: 'Analytics', href: '/protected/analytics',      icon: BarChart2,   color: 'bg-rose-500'   },
  { label: 'Goals',     href: '/protected/goals',          icon: Target,      color: 'bg-violet-500' },
  { label: 'Library',  href: '/protected/readapp',         icon: BookOpen,    color: 'bg-emerald-500'},
  { label: 'Meditate', href: '/protected/meditations',     icon: Moon,        color: 'bg-indigo-500' },
  { label: 'Notes',    href: '/protected/note',            icon: NotebookPen, color: 'bg-amber-500'  },
  { label: 'Planner',  href: '/protected/planner',         icon: Calendar,    color: 'bg-blue-500'   },
  { label: 'Review',   href: '/protected/planner/review',  icon: ClipboardList, color: 'bg-teal-500' },
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
