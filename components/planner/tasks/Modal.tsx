'use client'

import React from 'react'

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-background rounded-xl p-4 w-[90%] max-w-sm">
        {children}
        <button
          onClick={onClose}
          className="mt-2 text-sm text-muted-foreground"
        >
          Close
        </button>
      </div>
    </div>
  )
}
