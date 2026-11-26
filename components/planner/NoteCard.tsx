'use client'

import type { ReactNode } from 'react'
import { HelpTip } from '@/components/ui/help-tip'
import type { HelpTopic } from '@/lib/help'

// The coloured note cards of the day: morning intention and evening reflection
export default function NoteCard({ icon, title, help, gradient, value, placeholder, minHeight, disabled, onChange, onBlur, children }: {
  icon: ReactNode
  title: string
  help: HelpTopic
  gradient: string
  value: string
  placeholder: string
  minHeight: string
  disabled?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  children?: ReactNode   // extra content under the text (e.g. the top 3)
}) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 shadow-sm`}>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{title}</span>
          <HelpTip topic={help} tone="onDark" align="left" className="-my-1" />
        </div>
        <textarea
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-full bg-transparent border-none text-white text-[16px] font-semibold placeholder:text-white/40 focus:ring-0 resize-none outline-none disabled:opacity-60"
          style={{ minHeight }}
        />
        {children}
      </div>
    </div>
  )
}
