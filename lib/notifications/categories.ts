// Notification categories: each maps to a boolean column on
// notification_preferences and covers one or more notification `type`s.
// Shared by the settings UI and the server-side delivery.

export type NotificationCategoryKey =
  | 'task_reminders'
  | 'planner_reminders'
  | 'goal_deadlines'
  | 'goal_progress'
  | 'messages'
  | 'posts'
  | 'prayer'
  | 'reading_reminders'
  | 'money_alerts'
  | 'weekly_summary'

export interface NotificationCategory {
  key: NotificationCategoryKey
  label: string
  description: string
  group: 'Planning' | 'Partner' | 'Habits'
  types: string[]
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: 'task_reminders', group: 'Planning', label: 'Task reminders', description: 'Before each planner event, as set on the event', types: ['task_reminder'] },
  { key: 'planner_reminders', group: 'Planning', label: 'Daily planner', description: 'Morning plan and evening reflection nudges', types: ['planner_reminder'] },
  { key: 'goal_deadlines', group: 'Planning', label: 'Goal deadlines', description: 'A week, 3 days and a day before goals and visions are due', types: ['goal_deadline'] },
  { key: 'goal_progress', group: 'Partner', label: 'Goal updates', description: 'New and completed goals, yours and shared ones', types: ['goal_progress', 'goal_created'] },
  { key: 'messages', group: 'Partner', label: 'Partner invites & messages', description: 'Partner requests and direct messages', types: ['message', 'partner_invite'] },
  { key: 'posts', group: 'Partner', label: 'Posts & comments', description: 'Shared posts, comments, likes and @mentions', types: ['post', 'comment', 'mention', 'like'] },
  { key: 'prayer', group: 'Partner', label: 'Prayer & meditation', description: 'When your partner prays or meditates, and streak nudges', types: ['meditation', 'partner_prayer', 'partner_prayer_nudge'] },
  { key: 'reading_reminders', group: 'Habits', label: 'Reading & work log', description: 'Daily reading and creative work reminders', types: ['reading_reminder', 'work_log_reminder'] },
  { key: 'money_alerts', group: 'Habits', label: 'Budget alerts', description: 'When spending crosses your budget thresholds', types: ['budget_alert'] },
  { key: 'weekly_summary', group: 'Habits', label: 'Weekly summary email', description: 'Sunday email with your week at a glance', types: [] },
]

export type NotificationPreferences = Record<NotificationCategoryKey, boolean> & {
  quiet_start: string | null // 'HH:MM' local time, or null for no quiet hours
  quiet_end: string | null
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  ...(Object.fromEntries(NOTIFICATION_CATEGORIES.map(c => [c.key, true])) as Record<NotificationCategoryKey, boolean>),
  quiet_start: null,
  quiet_end: null,
}

export function categoryForType(type: string | null | undefined) {
  return NOTIFICATION_CATEGORIES.find(c => type && c.types.includes(type)) ?? null
}

// Pushes for these still go out during quiet hours (the user scheduled them)
const QUIET_HOURS_EXEMPT = new Set(['task_reminder', 'system'])

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Whether `minutes` (since local midnight) falls in the quiet window; windows may cross midnight
export function inQuietHours(prefs: Pick<NotificationPreferences, 'quiet_start' | 'quiet_end'> | null | undefined, minutes: number, type?: string) {
  if (!prefs?.quiet_start || !prefs?.quiet_end || prefs.quiet_start === prefs.quiet_end) return false
  if (type && QUIET_HOURS_EXEMPT.has(type)) return false
  const start = toMinutes(prefs.quiet_start)
  const end = toMinutes(prefs.quiet_end)
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end
}

// In-app link for a notification: stored URL first, then a sensible page per type
export function notificationUrl(n: { type?: string | null; data?: { url?: string } | null }) {
  if (n.data?.url) return n.data.url
  switch (n.type) {
    case 'task_reminder':
    case 'planner_reminder':
      return '/protected/planner'
    case 'goal_deadline':
    case 'goal_progress':
    case 'goal_created':
      return '/protected/goals'
    case 'reading_reminder':
    case 'work_log_reminder':
      return '/protected/readapp'
    case 'meditation':
      return '/protected/meditations'
    case 'partner_prayer':
    case 'partner_prayer_nudge':
      return '/protected/posts?tab=prayer'
    case 'budget_alert':
      return '/protected/planner/day'
    case 'message':
    case 'partner_invite':
      return '/protected/profile'
    default:
      return '/protected/posts'
  }
}

export function notificationIcon(type: string | null | undefined) {
  switch (type) {
    case 'comment': return '💬'
    case 'like': return '❤️'
    case 'meditation': return '🧘'
    case 'partner_prayer':
    case 'partner_prayer_nudge': return '🙏'
    case 'post': return '📝'
    case 'mention': return '📣'
    case 'task_reminder': return '⏰'
    case 'planner_reminder': return '📅'
    case 'goal_deadline': return '🎯'
    case 'goal_progress':
    case 'goal_created': return '🏆'
    case 'reading_reminder': return '📚'
    case 'work_log_reminder': return '✍️'
    case 'budget_alert': return '💰'
    case 'partner_invite': return '🤝'
    default: return '🔔'
  }
}
