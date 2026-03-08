'use client'

import React from 'react'

export function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    // Increased z-index to 9999 to sit above the bottom nav
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  )
}