import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, visibility } = await req.json()

    // 2. Fetch Partner ID for the notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single()

    const partnerId = profile?.partner_id

    // 3. Insert Post (Satisfying all NOT NULL constraints)
    const { data: post, error: dbError } = await supabase
      .from('posts')
      .insert({
        content,
        visibility,
        author_id: user.id, // Mandatory column in your schema
        user_id: user.id,   // Included for consistency
        partner_id: visibility === 'shared' ? partnerId : null,
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Database Insert Error:", dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 4. Trigger Notification (Only if shared and partner exists)
    if (partnerId && visibility === 'shared') {
      try {
        await fetch(`${new URL(req.url).origin}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: partnerId,
            title: 'New post from your partner 🤍',
            body: content.slice(0, 60) + (content.length > 60 ? '...' : ''),
            url: '/protected/posts',
          })
        })
      } catch (notifyError) {
        console.error("⚠️ Notification failed, but post was saved:", notifyError)
      }
    }

    return NextResponse.json({ post })

  } catch (err: any) {
    console.error("❌ API Route Crash:", err.message)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}