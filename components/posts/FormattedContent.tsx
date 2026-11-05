'use client'

import type { ReactNode } from 'react'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Mark search matches inside a piece of plain text
function withHighlight(text: string, highlight: string, keyPrefix: string): ReactNode[] {
  if (!highlight) return [text]
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === highlight.toLowerCase()
      ? <mark key={`${keyPrefix}-${i}`} className="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30">{p}</mark>
      : p,
  )
}

/**
 * Text with @mentions in violet and optional search highlighting
 */
export function FormattedContent({ content, highlight = '' }: { content: string; highlight?: string }) {
  const parts = content.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, index) =>
        /^@\w+$/.test(part) ? (
          <span key={index} className="text-violet-600 dark:text-violet-400 font-semibold">
            {withHighlight(part, highlight, String(index))}
          </span>
        ) : (
          <span key={index}>{withHighlight(part, highlight, String(index))}</span>
        ),
      )}
    </>
  )
}
