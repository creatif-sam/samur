'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { JSX, useEffect, useState } from 'react'
import {
  Home,
  Target,
  Calendar,
  Plus,
  User,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const navItems = [
  { href: '/protected', label: 'Home', icon: Home },
  { href: '/protected/goals', label: 'Goals', icon: Target },
  { href: '/protected/planner', label: 'Planner', icon: Calendar },
  { href: '/protected/posts', label: 'Posts', icon: Plus },
  { href: '/protected/readapp', label: 'ReadApp', icon: BookOpen },
  { href: '/protected/profile', label: 'Profile', icon: User },
]

export function BottomNav(): JSX.Element {
  const pathname = usePathname()
  const supabase = createClient()

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', auth.user.id)
        .single()

      setAvatarUrl(data?.avatar_url ?? null)
    }

    void loadProfile()
  }, [supabase])

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
              {item.label === 'Profile' ? (
                avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    width={24}
                    height={24}
                    className={cn(
                      'rounded-full object-cover',
                      isActive
                        ? 'ring-2 ring-violet-600'
                        : 'ring-2 ring-white'
                    )}
                  />
                ) : (
                  <User size={20} />
                )
              ) : (
                <item.icon size={20} />
              )}

              <span className="text-xs mt-1">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
