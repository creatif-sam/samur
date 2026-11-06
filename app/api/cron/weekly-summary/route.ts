import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWeeklySummary } from '@/lib/weekly-summary/send'
import type { SummaryUser } from '@/lib/weekly-summary/stats'

// Sunday morning email: the week just finished, compared with the one before
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const service = createServiceClient()

    // Every user, page by page (the admin API returns 50 at a time by default)
    const users: SummaryUser[] = []
    for (let page = 1; ; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
      if (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ ok: false, error: 'Failed to fetch users' }, { status: 500 })
      }
      users.push(...data.users)
      if (data.users.length < 200) break
    }

    // People who switched the weekly email off in notification settings
    const { data: optedOut } = await service.from('notification_preferences').select('user_id').eq('weekly_summary', false)
    const skip = new Set((optedOut ?? []).map(p => p.user_id))

    let sent = 0
    const failed: { user: string; error: string }[] = []
    for (const user of users) {
      if (!user.email || skip.has(user.id)) continue
      // One person's failure never stops the next person's email
      const result = await sendWeeklySummary(resend, service, user)
      if (result.ok) sent++
      else {
        console.error(`Weekly summary failed for ${user.id}:`, result.error)
        failed.push({ user: user.id, error: result.error })
      }
    }

    // A non-200 status makes the GitHub Actions run fail, so a broken setup is noticed
    return NextResponse.json({ ok: failed.length === 0, sent, skipped: skip.size, failed }, { status: failed.length ? 502 : 200 })
  } catch (err) {
    console.error('Weekly summary cron error:', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
