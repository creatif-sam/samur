'use client'

import { useEffect, useState } from 'react'

export interface VisibleArea {
  height: number    // CSS px of screen you can actually see (above the on-screen keyboard)
  offsetTop: number // how far iOS has scrolled the page to keep the caret in view
  keyboardOpen: boolean
}

// The part of the screen not covered by the on-screen keyboard.
//
// iOS (Safari and the installed app) does not shrink the page or `100dvh` when the
// keyboard opens: it slides the keyboard over the page. Full-screen panels sized with
// `100dvh` then have their bottom rows (like an editor toolbar) hidden behind it.
// Sizing a fixed panel to this area keeps its last row sitting right above the keyboard.
// Returns null when the browser can't tell, or while the page is pinch-zoomed.
export function useVisualViewport(): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null)

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Pinch-zoom also shrinks the visual viewport; leave the layout alone then
        if (vv.scale > 1.01) { setArea(null); return }
        const height = Math.round(vv.height)
        const offsetTop = Math.max(0, Math.round(vv.offsetTop))
        // A big gap between the window and what is visible means a keyboard is up
        const keyboardOpen = window.innerHeight - height > 120
        setArea(prev =>
          prev && prev.height === height && prev.offsetTop === offsetTop && prev.keyboardOpen === keyboardOpen
            ? prev
            : { height, offsetTop, keyboardOpen },
        )
      })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return area
}
