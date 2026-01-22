'use client'

import { Button } from '@/components/ui/button'

interface MeditationButtonProps {
  onOpen: () => void
}

export default function MeditationButton({
  onOpen,
}: MeditationButtonProps) {
  return (
    <Button size="sm" variant="outline" onClick={onOpen}>
      New Meditation
    </Button>
  )
}
