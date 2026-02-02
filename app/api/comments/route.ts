import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: sender } } = await supabase.auth.getUser()
    if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, content } = await req.json()

    // 1. CRITICAL CHANGE: Table name must be 'post_comments' to match your schema
    const { data: comment, error: dbError } = await supabase
      .from('post_comments') 
      .insert({
        post_id: postId,
        author_id: sender.id, // Your schema uses author_id
        content: content.trim()
      })
      .select(`
        *,
        post:post_id (
          author_id
        )
      `)
      .single()

    if (dbError) {
      console.error("❌ Database Error:", dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 2. Notification Logic (Your bridge to the partner)
    const postOwnerId = (comment.post as any)?.author_id
    if (postOwnerId && postOwnerId !== sender.id) {
      const senderName = sender.user_metadata?.name || 'Your partner'
      await fetch(`${new URL(req.url).origin}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: postOwnerId,
          type: 'comment',
          title: 'New Comment 💬',
          body: `${senderName}: "${content.slice(0, 40)}..."`,
          url: `/protected/posts` 
        })
      })
    }

    return NextResponse.json({ success: true, comment })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}