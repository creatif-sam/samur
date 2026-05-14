import SplashLoader from '@/components/SplashLoader'

// Next.js App Router shows this automatically during page-level loading
// (Suspense boundaries, route transitions, server component fetches)
export default function Loading() {
  return <SplashLoader />
}
