import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectMentions, getPartnerId } from '@/lib/mentions'

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

    const senderName = sender.user_metadata?.name || 'Your partner'
    const origin = new URL(req.url).origin

    // 2. Notification to post owner (if not commenting on own post)
    const postOwnerId = (comment.post as any)?.author_id
    if (postOwnerId && postOwnerId !== sender.id) {
      await fetch(`${origin}/api/notifications`, {
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

    // 3. Check for @ mentions and notify mentioned users
    const mentions = detectMentions(content)
    if (mentions.length > 0) {
      const partnerId = await getPartnerId(supabase, sender.id)
      if (partnerId && partnerId !== postOwnerId) {
        // Get partner's name to check if they were mentioned
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('name, full_name')
          .eq('id', partnerId)
          .single()

        const partnerMentioned = mentions.some(mention => 
          mention.toLowerCase() === partnerProfile?.name?.toLowerCase() ||
          mention.toLowerCase() === partnerProfile?.full_name?.toLowerCase()
        )

        if (partnerMentioned) {
          await fetch(`${origin}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: partnerId,
              type: 'mention',
              title: `${senderName} mentioned you 📣`,
              body: `"${content.slice(0, 50)}..."`,
              url: `/protected/posts`
            })
          })
        }
      }
    }

    return NextResponse.json({ success: true, comment })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}