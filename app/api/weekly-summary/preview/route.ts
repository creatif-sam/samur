import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWeeklySummary } from '@/lib/weekly-summary/send'

// A soft guard against repeated taps (per server instance)
const lastSent = new Map<string, number>()
const COOLDOWN_MS = 60_000

// Sends this week's summary to the signed-in user's own address, right now.
// There is no way to choose a recipient, and it ignores the weekly on/off setting
// because the person asked for it. It doubles as a check that email delivery works.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not set up on the server (RESEND_API_KEY is missing).' }, { status: 503 })
  }

  const wait = (lastSent.get(user.id) ?? 0) + COOLDOWN_MS - Date.now()
  if (wait > 0) {
    return NextResponse.json({ error: `Please wait ${Math.ceil(wait / 1000)} seconds before sending another.` }, { status: 429 })
  }

  const result = await sendWeeklySummary(new Resend(process.env.RESEND_API_KEY), createServiceClient(), user)
  if (!result.ok) {
    // Resend's own message is shown so setup problems are easy to spot
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  lastSent.set(user.id, Date.now())
  return NextResponse.json({ ok: true, to: user.email })
}
