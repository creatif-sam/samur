import { NextResponse } from 'next/server'

// The deploy currently being served; open apps compare it with their own
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    // `now` lets the app check that the device's clock is right (see lib/clockCheck.ts)
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null, now: Date.now() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
