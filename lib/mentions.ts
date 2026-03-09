// Utility functions for handling @ mentions in posts and comments

/**
 * Detects @ mentions in text content
 * Returns array of mentioned user names
 */
export function detectMentions(content: string): string[] {
  // Match @username pattern (alphanumeric and underscore)
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

/**
 * Highlights @ mentions in text with HTML/React styling
 * Returns formatted content with mentions wrapped in spans
 */
export function formatMentions(content: string): string {
  return content.replace(
    /@(\w+)/g,
    '<span class="text-violet-600 dark:text-violet-400 font-semibold">@$1</span>'
  );
}

/**
 * Gets partner ID from user's profile for mention notifications
 */
export async function getPartnerId(supabase: any, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', userId)
    .single();
    
  return profile?.partner_id || null;
}

/**
 * Sends notification to mentioned users
 */
export async function notifyMentions(
  supabase: any,
  content: string,
  currentUserId: string,
  currentUserName: string,
  contextType: 'post' | 'comment',
  url: string
) {
  const mentions = detectMentions(content);
  if (mentions.length === 0) return;
  
  // Get partner ID
  const partnerId = await getPartnerId(supabase, currentUserId);
  if (!partnerId) return;
  
  // Get partner's profile to match mention names
  const { data: partnerProfile } = await supabase
    .from('profiles')
    .select('id, name, full_name')
    .eq('id', partnerId)
    .single();
    
  if (!partnerProfile) return;
  
  // Check if partner was mentioned (by name or full_name)
  const partnerMentioned = mentions.some(mention => 
    mention.toLowerCase() === partnerProfile.name?.toLowerCase() ||
    mention.toLowerCase() === partnerProfile.full_name?.toLowerCase()
  );
  
  if (partnerMentioned) {
    // Send notification
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: partnerId,
        type: 'mention',
        title: `${currentUserName} mentioned you 📣`,
        body: `in a ${contextType}: "${content.slice(0, 50)}..."`,
        url
      })
    });
  }
}
