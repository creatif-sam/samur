// Post types live in the text itself as a first line ("🙏 Prayer request"),
// so they need no database change and still read naturally in notifications.

export type PostKind = 'prayer' | 'gratitude' | 'insight' | 'win'

export const POST_KINDS: { id: PostKind; emoji: string; label: string; prompt: string; pill: string }[] = [
  {
    id: 'prayer', emoji: '🙏', label: 'Prayer request', prompt: 'What would you like prayer for?',
    pill: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  {
    id: 'gratitude', emoji: '✨', label: 'Gratitude', prompt: 'What are you thankful for today?',
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    id: 'insight', emoji: '📖', label: 'Insight', prompt: 'What did God show you?',
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    id: 'win', emoji: '🎉', label: 'Win', prompt: 'What went well? Celebrate it.',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
]

export function kindInfo(kind: PostKind | null) {
  return POST_KINDS.find(k => k.id === kind) ?? null
}

// Split "🙏 Prayer request\nPlease pray for…" into its type and the words
export function parsePost(content: string): { kind: PostKind | null; body: string } {
  const [first, ...rest] = content.split('\n')
  const match = POST_KINDS.find(k => first.trim() === `${k.emoji} ${k.label}`)
  if (!match) return { kind: null, body: content }
  return { kind: match.id, body: rest.join('\n').replace(/^\n+/, '') }
}

export function composePost(kind: PostKind | null, body: string) {
  const info = kindInfo(kind)
  const text = body.trim()
  return info ? `${info.emoji} ${info.label}\n${text}` : text
}

// "Today", "Yesterday", "Monday", or "Mon, Nov 3" for older posts
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}
