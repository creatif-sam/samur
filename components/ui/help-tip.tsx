'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { HELP, type HelpTopic } from '@/lib/help'
import { HELP_FR } from '@/lib/helpFr'
import { InfoTip } from '@/components/ui/info-tip'

// The "i" for a feature: the wording lives in lib/help.ts (English) and lib/helpFr.ts (French),
// so every explanation is in one place per language.
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
  const { tr, language } = useTranslation()
  const { title, text } = (language === 'fr' ? HELP_FR : HELP)[topic]
  return (
    <InfoTip title={title} label={tr('About {title}', { title })} align={align} tone={tone} className={className}>
      {text}
    </InfoTip>
  )
}
