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
