'use client'

import { HELP, type HelpTopic } from '@/lib/help'
import { InfoTip } from '@/components/ui/info-tip'

// The "i" for a feature: the wording lives in lib/help.ts, so every explanation is in one place.
export function HelpTip({
  topic,
  align,
  tone,
  className,
}: {
  topic: HelpTopic
  align?: 'left' | 'right'
  tone?: 'default' | 'onDark'
  className?: string
}) {
  const { title, text } = HELP[topic]
  return (
    <InfoTip title={title} label={`About ${title}`} align={align} tone={tone} className={className}>
      {text}
    </InfoTip>
  )
}
