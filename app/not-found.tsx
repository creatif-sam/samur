'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, WifiOff, Search } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background overflow-hidden relative">

      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-72 h-72 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a21caf, transparent)' }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">

        {/* Icon stack */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <div className="w-28 h-28 rounded-full border-2 border-violet-500/20 flex items-center justify-center">
            {/* Inner ring */}
            <div className="w-20 h-20 rounded-full border border-violet-500/30 bg-violet-500/10 flex items-center justify-center">
              <Search className="w-9 h-9 text-violet-400" strokeWidth={1.5} />
            </div>
          </div>
          {/* Floating wifi-off badge */}
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg">
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* 404 label */}
        <p
          className="text-7xl font-black tracking-tighter mb-2 bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 50%, #db2777 100%)' }}
        >
          404
        </p>

        <h1 className="text-xl font-black uppercase tracking-widest text-foreground mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-2 max-w-[260px]">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <p className="text-xs text-muted-foreground/60 mb-10 max-w-[260px]">
          If you're offline, check your connection and try again.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a21caf)' }}
          >
            <Home className="w-4 h-4" />
            Go to Home
          </Link>

          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-sm font-bold text-foreground border border-border bg-muted/40 hover:bg-muted transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Bottom hint */}
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
          Mastery &bull; PWA
        </p>
      </div>
    </div>
  )
}
