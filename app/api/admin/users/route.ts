import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdmin, listAllUsers } from '@/lib/admin'

const ONLINE_WINDOW_MS = 5 * 60 * 1000

// Admin-only overview of every account. ?check=1 just answers whether the
// caller is an admin (used to show or hide the section).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = isAdmin(user)
  if (new URL(request.url).searchParams.get('check')) return NextResponse.json({ isAdmin: admin })
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const service = createServiceClient()
  const [authUsers, { data: profiles }] = await Promise.all([
    listAllUsers(service),
    service.from('profiles').select('id, name, avatar_url, last_seen, partner_id, created_at'),
  ])
  const byId = new Map((profiles ?? []).map(p => [p.id, p]))
  const now = Date.now()

  const users = authUsers
    .map(u => {
      const p = byId.get(u.id)
      const lastSeen = p?.last_seen ?? u.last_sign_in_at ?? null
      const partner = p?.partner_id ? byId.get(p.partner_id) : null
      return {
        id: u.id,
        email: u.email ?? null,
        name: p?.name || (u.user_metadata?.name as string | undefined) || null,
        avatar_url: p?.avatar_url ?? null,
        created_at: u.created_at,
        last_seen: lastSeen,
        online: !!p?.last_seen && now - new Date(p.last_seen).getTime() < ONLINE_WINDOW_MS,
        partner_name: p?.partner_id ? partner?.name || 'Partner' : null,
        is_you: u.id === user.id,
      }
    })
    .sort((a, b) => (b.last_seen ?? '').localeCompare(a.last_seen ?? ''))

  return NextResponse.json({ users })
}
