import { NextResponse } from 'next/server'

// The deploy currently being served; open apps compare it with their own
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
