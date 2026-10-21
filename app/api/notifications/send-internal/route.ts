import { NextResponse } from 'next/server'
import { notify } from '@/lib/push-notifications'

/**
 * Internal notification sender for system/cron jobs.
 * Requires CRON_SECRET instead of a user session. Preferences and quiet hours
 * are applied by `notify`.
 */
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, type, title, body, url, data, tag } = await request.json()
    if (typeof targetUserId !== 'string' || !targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    const result = await notify({
      userId: targetUserId,
      type: type || 'system',
      title: title || 'SamUr',
      body: body || '',
      url,
      data: data && typeof data === 'object' ? data : undefined,
      tag,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Internal notification error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
