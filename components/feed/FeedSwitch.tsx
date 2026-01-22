'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import clsx from 'clsx'

export default function FeedSwitch() {
  const router = useRouter()
  const pathname = usePathname()

  const isPosts = pathname.startsWith('/protected/posts')
  const isMeditations = pathname.startsWith('/protected/meditations')

  return (
    <div className="flex rounded-md border p-1 gap-1 bg-muted">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => router.push('/protected/posts')}
        className={clsx(
          'px-4',
          isPosts &&
            'bg-violet-600 text-white hover:bg-violet-600'
        )}
      >
        Posts
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => router.push('/protected/meditations')}
        className={clsx(
          'px-4',
          isMeditations &&
            'bg-violet-600 text-white hover:bg-violet-600'
        )}
      >
        Meditations
      </Button>
    </div>
  )
}
