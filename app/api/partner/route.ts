import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notify } from '@/lib/push-notifications'
import { findUserByEmail } from '@/lib/admin'

// Partner linking runs here (service client) so both profiles always change
// together, and only after the invite has been checked.

type ProfileRow = { id: string; name: string | null; avatar_url: string | null; partner_id: string | null }

async function signedInUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function loadProfiles(service: ReturnType<typeof createServiceClient>, ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>()
  const { data } = await service.from('profiles').select('id, name, avatar_url, partner_id').in('id', ids)
  return new Map((data ?? []).map((p: ProfileRow) => [p.id, p]))
}

// Current partner and pending invites, both directions
export async function GET() {
  const user = await signedInUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()

  const { data: me } = await service.from('profiles').select('partner_id').eq('id', user.id).maybeSingle()
  const { data: requests } = await service
    .from('partner_requests')
    .select('id, from_user_id, to_user_id, created_at')
    .eq('status', 'pending')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const ids = new Set<string>()
  if (me?.partner_id) ids.add(me.partner_id)
  for (const r of requests ?? []) ids.add(r.from_user_id === user.id ? r.to_user_id : r.from_user_id)
  const profiles = await loadProfiles(service, [...ids])
  const person = (id: string) => {
    const p = profiles.get(id)
    return { id, name: p?.name || 'Someone', avatar_url: p?.avatar_url ?? null }
  }

  return NextResponse.json({
    partner: me?.partner_id ? person(me.partner_id) : null,
    incoming: (requests ?? []).filter(r => r.to_user_id === user.id).map(r => ({ id: r.id, from: person(r.from_user_id) })),
    outgoing: (requests ?? []).filter(r => r.from_user_id === user.id).map(r => ({ id: r.id, to: person(r.to_user_id) })),
  })
}

export async function POST(request: Request) {
  const user = await signedInUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  const body = await request.json().catch(() => ({}))
  const action = body.action as string

  const { data: me } = await service.from('profiles').select('id, name, partner_id').eq('id', user.id).maybeSingle()
  const myName = me?.name || user.user_metadata?.name || 'Someone'

  // Invite by exact email address (no browsing of other users)
  if (action === 'invite') {
    if (me?.partner_id) return NextResponse.json({ error: 'You already have a partner. Disconnect first.' }, { status: 409 })
    const email = typeof body.email === 'string' ? body.email : ''
    const target = await findUserByEmail(service, email)
    // Same message whether or not the account exists, so emails can't be probed
    const notFound = NextResponse.json({ error: "We couldn't send an invite to that email. Check it's the address they signed up with." }, { status: 404 })
    if (!target || target.id === user.id) return notFound

    const { data: targetProfile } = await service.from('profiles').select('partner_id').eq('id', target.id).maybeSingle()
    if (targetProfile?.partner_id) return notFound

    const { data: existing } = await service
      .from('partner_requests')
      .select('id')
      .eq('status', 'pending')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${target.id}),and(from_user_id.eq.${target.id},to_user_id.eq.${user.id})`)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'There is already a pending invite between you two.' }, { status: 409 })
    }

    const { error } = await service.from('partner_requests').insert({ from_user_id: user.id, to_user_id: target.id })
    if (error) return NextResponse.json({ error: 'Could not send the invite' }, { status: 500 })

    await notify({
      userId: target.id,
      type: 'partner_invite',
      title: 'New Partner Invite 🤝',
      body: `${myName} invited you to be their accountability partner.`,
      url: '/protected/profile',
    })
    return NextResponse.json({ success: true })
  }

  // Accept / decline an invite sent to me; cancel one I sent
  if (action === 'accept' || action === 'decline' || action === 'cancel') {
    const { data: req } = await service
      .from('partner_requests')
      .select('id, from_user_id, to_user_id, status')
      .eq('id', body.requestId)
      .maybeSingle()
    if (!req || req.status !== 'pending') return NextResponse.json({ error: 'This invite is no longer available' }, { status: 404 })

    if (action === 'cancel') {
      if (req.from_user_id !== user.id) return NextResponse.json({ error: 'Not your invite' }, { status: 403 })
      await service.from('partner_requests').delete().eq('id', req.id)
      return NextResponse.json({ success: true })
    }

    if (req.to_user_id !== user.id) return NextResponse.json({ error: 'Not your invite' }, { status: 403 })

    if (action === 'decline') {
      await service.from('partner_requests').update({ status: 'declined' }).eq('id', req.id)
      return NextResponse.json({ success: true })
    }

    // accept: both must still be free, then link both sides together
    const profiles = await loadProfiles(service, [req.from_user_id, req.to_user_id])
    if (profiles.get(req.from_user_id)?.partner_id || profiles.get(req.to_user_id)?.partner_id) {
      await service.from('partner_requests').update({ status: 'declined' }).eq('id', req.id)
      return NextResponse.json({ error: 'One of you is already connected to someone else' }, { status: 409 })
    }

    const [a, b] = await Promise.all([
      service.from('profiles').update({ partner_id: req.from_user_id }).eq('id', req.to_user_id),
      service.from('profiles').update({ partner_id: req.to_user_id }).eq('id', req.from_user_id),
    ])
    if (a.error || b.error) {
      // Undo a half-applied link
      await Promise.all([
        service.from('profiles').update({ partner_id: null }).eq('id', req.to_user_id),
        service.from('profiles').update({ partner_id: null }).eq('id', req.from_user_id),
      ])
      return NextResponse.json({ error: 'Could not connect. Please try again.' }, { status: 500 })
    }

    await service.from('partner_requests').update({ status: 'accepted' }).eq('id', req.id)
    // Any other pending invites involving either person no longer apply
    await service
      .from('partner_requests')
      .update({ status: 'declined' })
      .eq('status', 'pending')
      .or(`from_user_id.in.(${req.from_user_id},${req.to_user_id}),to_user_id.in.(${req.from_user_id},${req.to_user_id})`)

    await notify({
      userId: req.from_user_id,
      type: 'partner_invite',
      title: 'Invite Accepted! 🎉',
      body: `${myName} accepted your partner invite.`,
      url: '/protected/profile',
    })
    return NextResponse.json({ success: true })
  }

  // Disconnect both sides (only clears the partner's link if it points back at me)
  if (action === 'disconnect') {
    const partnerId = me?.partner_id
    await service.from('profiles').update({ partner_id: null }).eq('id', user.id)
    if (partnerId) {
      await service.from('profiles').update({ partner_id: null }).eq('id', partnerId).eq('partner_id', user.id)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
