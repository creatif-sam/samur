'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background text-center">
      <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center mb-6">
        <span className="text-4xl">📴</span>
      </div>
      <h1 className="text-2xl font-black uppercase tracking-widest text-foreground mb-2">
        You're Offline
      </h1>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
        No internet connection. Check your network and try again — your data is safe.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full px-8 py-3 bg-violet-600 text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        Try again
      </button>
    </div>
  )
}
