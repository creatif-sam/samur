'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function NotificationToast({ notification, onClose }: any) {
  const router = useRouter()
  if (!notification) return null

  return (
    <div 
      onClick={() => {
        router.push('/protected/posts')
        onClose()
      }}
      className="fixed top-16 left-4 right-4 z-[100] bg-white dark:bg-slate-900 border-2 border-[#7c3aed] rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-10 cursor-pointer flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-tighter">Just Now</p>
        <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1 font-bold">{notification.title}</p>
        <p className="text-xs text-slate-500 line-clamp-1">{notification.body}</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  )
}