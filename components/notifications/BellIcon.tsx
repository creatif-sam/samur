import type { SVGProps } from 'react'

// A soft, rounded bell: outline when you are caught up, solid when something is waiting,
// slashed when notifications are off. Uses currentColor, so it takes any text colour.
const BODY = 'M6 10a6 6 0 0 1 12 0c0 3.2.9 5 1.9 6.1.3.3.1.9-.4.9H4.5c-.5 0-.7-.6-.4-.9C5.1 15 6 13.2 6 10Z'
const CLAPPER = 'M9.8 20.2a2.4 2.4 0 0 0 4.4 0'

export function BellIcon({
  filled = false,
  slashed = false,
  ...props
}: { filled?: boolean; slashed?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3.2V4.4" />
      <path d={BODY} fill={filled ? 'currentColor' : 'none'} />
      <path d={CLAPPER} />
      {slashed && <path d="M4 4l16 16" strokeWidth={2.2} />}
    </svg>
  )
}
