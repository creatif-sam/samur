'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, Calendar, MessageSquare, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/supabase/client';
import Image from 'next/image';

const navItems = [
  { href: '/protected', label: 'Home', icon: Home },
  { href: '/protected/goals', label: 'Goals', icon: Target },
  { href: '/protected/planner', label: 'Planner', icon: Calendar },
  { href: '/protected/posts', label: 'Posts', icon: MessageSquare },
  { href: '/protected/readapp', label: 'ReadApp', icon: BookOpen },
  { href: '/protected/profile', label: 'Profile', icon: User }, // Re-added Profile tab
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label === 'Profile' ? (
                user?.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt="Profile"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <User size={20} /> // Fallback to default icon
                )
              ) : (
                <item.icon size={20} /> // Fallback to default icon
              )}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}