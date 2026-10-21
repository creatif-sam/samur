import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectMentions, getPartnerId } from '@/lib/mentions'
import { notify } from '@/lib/push-notifications'

// Add a comment to a post, or a reply to a comment (parentId)
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: sender } } = await supabase.auth.getUser()
    if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, content, parentId } = await req.json()
    const text = typeof content === 'string' ? content.trim() : ''
    if (typeof postId !== 'string' || !text) {
      return NextResponse.json({ error: 'Missing post or comment text' }, { status: 400 })
    }

    let parentAuthorId: string | null = null
    if (typeof parentId === 'string') {
      const { data: parent } = await supabase
        .from('post_comments')
        .select('author_id, post_id')
        .eq('id', parentId)
        .maybeSingle()
      if (!parent || parent.post_id !== postId) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
      }
      parentAuthorId = parent.author_id
    }

    const { data: comment, error: dbError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: sender.id,
        parent_comment_id: typeof parentId === 'string' ? parentId : null,
        content: text,
      })
      .select('*, profiles:author_id (name, avatar_url), post:post_id (author_id)')
      .single()

    if (dbError) {
      console.error('Comment insert error:', dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const senderName = sender.user_metadata?.name || 'Your partner'
    const snippet = text.length > 50 ? `${text.slice(0, 50)}…` : text
    const postOwnerId = (comment.post as { author_id?: string } | null)?.author_id ?? null
    const notified = new Set<string>([sender.id])

    // Reply → the person replied to
    if (parentAuthorId && !notified.has(parentAuthorId)) {
      notified.add(parentAuthorId)
      await notify({
        userId: parentAuthorId,
        type: 'comment',
        title: `${senderName} replied 💬`,
        body: `"${snippet}"`,
        url: '/protected/posts?tab=posts',
      })
    }

    // Comment → the post's author
    if (postOwnerId && !notified.has(postOwnerId)) {
      notified.add(postOwnerId)
      await notify({
        userId: postOwnerId,
        type: 'comment',
        title: 'New Comment 💬',
        body: `${senderName}: "${snippet}"`,
        url: '/protected/posts?tab=posts',
      })
    }

    // @mention of the partner (if they weren't already notified above)
    const mentions = detectMentions(text)
    if (mentions.length > 0) {
      const partnerId = await getPartnerId(supabase, sender.id)
      if (partnerId && !notified.has(partnerId)) {
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
          await notify({
            userId: partnerId,
            type: 'mention',
            title: `${senderName} mentioned you 📣`,
            body: `"${snippet}"`,
            url: '/protected/posts?tab=posts',
          })
        }
      }
    }

    return NextResponse.json({ success: true, comment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
