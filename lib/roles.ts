import { appLanguage, appLocale, trNow } from '@/lib/i18n'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal } from '@/lib/types'
import { addDays, parseDateKey, toLocalDateKey } from '@/lib/dates'

// Roles, after Covey's Habits 2 and 3: you live in several roles (spouse, parent,
// disciple, professional…). Each has its own mission and vision, the goals that serve
// it, and the few "big rocks" you put first each week.
// Tables come from migration 20261125000000_roles.

export interface RoleCategory {
  id: string
  name: string
  emoji: string | null
  sort_order: number
  created_at?: string
}

export interface Role {
  id: string
  category_id?: string | null
  name: string
  emoji: string | null
  color: string
  mission: string | null
  vision: string | null
  sort_order: number
  is_archived: boolean
  created_at?: string
}

export interface WeeklyRock {
  id: string
  role_id: string | null
  goal_id: string | null
  week_start: string
  text: string
  done: boolean
  done_at: string | null
  sort_order: number
  created_at?: string
}

export const ROLE_COLORS = ['#7c3aed', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#475569']
export const ROLE_EMOJIS = ['💍', '👨‍👩‍👧', '🙏', '💼', '🧑‍🏫', '🤝', '🏃', '🎓', '🏠', '🌍', '🎨', '❤️']

// The four categories every account starts with, in this order; more can be added
export const SEED_CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Spiritual Life & Ministry', emoji: '🙏' },
  { name: 'Family', emoji: '🏠' },
  { name: 'Relationships & Social Life', emoji: '🤝' },
  { name: 'Professional Life', emoji: '💼' },
]

// Starter roles to pick from (any name can be typed instead), with the starter category each fits
export const ROLE_SUGGESTIONS: { name: string; emoji: string; category: string }[] = [
  { name: 'Disciple', emoji: '🙏', category: 'Spiritual Life & Ministry' },
  { name: 'Church member', emoji: '⛪', category: 'Spiritual Life & Ministry' },
  { name: 'Minister', emoji: '📖', category: 'Spiritual Life & Ministry' },
  { name: 'Spouse', emoji: '💍', category: 'Family' },
  { name: 'Parent', emoji: '👨‍👩‍👧', category: 'Family' },
  { name: 'Son or daughter', emoji: '🏠', category: 'Family' },
  { name: 'Friend', emoji: '🤝', category: 'Relationships & Social Life' },
  { name: 'Mentor', emoji: '🧑‍🏫', category: 'Relationships & Social Life' },
  { name: 'Professional', emoji: '💼', category: 'Professional Life' },
  { name: 'Entrepreneur', emoji: '🚀', category: 'Professional Life' },
  { name: 'Student', emoji: '🎓', category: 'Professional Life' },
]

export function sortCategories<C extends Pick<RoleCategory, 'sort_order' | 'created_at' | 'name'>>(cats: C[]) {
  return [...cats].sort((a, b) => a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.name.localeCompare(b.name))
}

// Roles grouped under their categories, in category order; roles with no (or a deleted)
// category come last under "Other roles". Empty categories are kept so you can add to them.
export function groupRolesByCategory<R extends Pick<Role, 'category_id' | 'sort_order' | 'created_at' | 'name'>, C extends RoleCategory>(
  roles: R[], categories: C[],
): { category: C | null; roles: R[] }[] {
  const cats = sortCategories(categories)
  const known = new Set(cats.map(c => c.id))
  const groups: { category: C | null; roles: R[] }[] = cats.map(c => ({
    category: c, roles: sortRoles(roles.filter(r => r.category_id === c.id)),
  }))
  const other = sortRoles(roles.filter(r => !r.category_id || !known.has(r.category_id)))
  if (other.length) groups.push({ category: null, roles: other })
  return groups
}

// The starter category a suggested role belongs in, among the user's categories
export function suggestedCategoryId(roleName: string, categories: Pick<RoleCategory, 'id' | 'name'>[]) {
  const hint = ROLE_SUGGESTIONS.find(s => s.name.toLowerCase() === roleName.trim().toLowerCase())?.category
  return hint ? categories.find(c => c.name.toLowerCase() === hint.toLowerCase())?.id ?? null : null
}

// Covey suggests keeping to about seven roles so each one gets real attention
export const ROLE_SOFT_LIMIT = 7
export const tooManyRoles = (activeCount: number) => activeCount > ROLE_SOFT_LIMIT

export const ROLE_GUIDE = {
  mission: {
    question: 'Who do you want to be in this role?',
    starter: 'In this role I ___, so that ___.',
    example: 'As a father I lead with patience and faith, so that my children know they are loved and know God.',
  },
  vision: {
    question: 'What does it look like when this role is lived well?',
    starter: 'I see ___.',
    example: 'I see children who are confident, kind and walking with God, and a home full of laughter.',
  },
} as const

// ── The week (Sunday to Saturday, as the Goals page counts it) ──

export function weekStart(todayKey = toLocalDateKey(new Date())) {
  return addDays(todayKey, -parseDateKey(todayKey).getDay())
}

// "Nov 22 to 28" or "Nov 29 to Dec 5"; in French "du 22 au 28 nov." or "du 29 nov. au 5 déc."
export function weekLabel(startKey: string) {
  const start = parseDateKey(startKey)
  const end = parseDateKey(addDays(startKey, 6))
  const month = (d: Date) => d.toLocaleDateString(appLocale(), { month: 'short' })
  const sameMonth = start.getMonth() === end.getMonth()
  if (appLanguage() === 'fr') {
    return trNow('{start} to {end}', {
      start: sameMonth ? `${start.getDate()}` : `${start.getDate()} ${month(start)}`,
      end: `${end.getDate()} ${month(end)}`,
    })
  }
  return trNow('{start} to {end}', {
    start: `${month(start)} ${start.getDate()}`,
    end: sameMonth ? `${end.getDate()}` : `${month(end)} ${end.getDate()}`,
  })
}

// ── Grouping goals ──

export interface GoalGroups<G> {
  byRole: Record<string, G[]>
  // Your own goals with no role yet, by their old vision ('' = no vision)
  unassigned: Record<string, G[]>
  unassignedCount: number
  // Your partner's goals shared with you: their role is theirs, so they sit apart
  shared: G[]
}

export function groupGoals<G extends Pick<Goal, 'owner_id' | 'vision_id'> & { role_id?: string | null }>(
  goals: G[], userId: string, roles: Pick<Role, 'id'>[],
): GoalGroups<G> {
  const known = new Set(roles.map(r => r.id))
  const groups: GoalGroups<G> = { byRole: {}, unassigned: {}, unassignedCount: 0, shared: [] }
  for (const g of goals) {
    if (g.owner_id && g.owner_id !== userId) { groups.shared.push(g); continue }
    if (g.role_id && known.has(g.role_id)) { (groups.byRole[g.role_id] ??= []).push(g); continue }
    ;(groups.unassigned[g.vision_id ?? ''] ??= []).push(g)
    groups.unassignedCount++
  }
  return groups
}

// A role's progress is the average of its goals' progress (as visions work)
export function roleProgress(goals: Pick<Goal, 'progress' | 'status'>[]) {
  if (!goals.length) return null
  const total = goals.reduce((sum, g) => sum + (g.status === 'done' ? 100 : Math.max(0, Math.min(100, g.progress ?? 0))), 0)
  return Math.round(total / goals.length)
}

export function sortRoles<R extends Pick<Role, 'sort_order' | 'created_at' | 'name'>>(roles: R[]) {
  return [...roles].sort((a, b) => a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.name.localeCompare(b.name))
}

// ── Database ──

// Only a missing table or column means the migration hasn't run; other errors (permissions, bad data) don't
const missing = (msg: string | undefined) => !!msg && /schema cache|does not exist|could not find the table|could not find the .* column/i.test(msg)

// `ready` is false until the roles migration has been run
export async function loadRoles(supabase: SupabaseClient, userId: string): Promise<{ roles: Role[]; ready: boolean }> {
  const { data, error } = await supabase.from('roles').select('*').eq('owner_id', userId)
  if (error) return { roles: [], ready: !missing(error.message) }
  return { roles: sortRoles((data ?? []) as Role[]), ready: true }
}

// Categories, adding the four starter ones on a fresh start (no categories and no roles yet).
// A unique (owner, name) key makes a second device's attempt harmless.
export async function loadCategories(supabase: SupabaseClient, userId: string, hasRoles: boolean): Promise<RoleCategory[]> {
  const { data, error } = await supabase.from('role_categories').select('*').eq('owner_id', userId)
  if (error) return []
  if ((data ?? []).length || hasRoles) return sortCategories((data ?? []) as RoleCategory[])
  const seed = SEED_CATEGORIES.map((c, i) => ({ owner_id: userId, name: c.name, emoji: c.emoji, sort_order: i }))
  await supabase.from('role_categories').upsert(seed, { onConflict: 'owner_id,name', ignoreDuplicates: true })
  const again = await supabase.from('role_categories').select('*').eq('owner_id', userId)
  return sortCategories(((again.data ?? []) as RoleCategory[]))
}

export async function loadRocks(supabase: SupabaseClient, userId: string, week: string): Promise<WeeklyRock[]> {
  const { data, error } = await supabase.from('weekly_rocks').select('*').eq('owner_id', userId).eq('week_start', week)
  if (error) throw error
  return ((data ?? []) as WeeklyRock[]).sort((a, b) => a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
}

export const NEEDS_UPDATE = 'Roles need a quick database update first: run the roles migration in Supabase.'
export const isMissingRoles = missing
