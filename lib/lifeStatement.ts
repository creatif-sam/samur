import type { SupabaseClient } from '@supabase/supabase-js'

// Your life mission and life vision. Kept in user_preferences
// (migration 20261124000000_life_mission_vision).
//
// Mission: why you exist and how you live it out, written in the present tense
// (a personal mission statement, as Covey describes it). Vision: the future you are
// working toward, described vividly enough to see. Goals and yearly visions sit under both.

export interface LifeStatement {
  mission: string
  vision: string
  updatedAt: string | null
}

export const EMPTY_LIFE: LifeStatement = { mission: '', vision: '', updatedAt: null }
export const MAX_CHARS = 2000

const COLS = 'life_mission, life_vision, life_statement_updated_at'
// The columns are missing until the migration is run
const isMissing = (msg: string | undefined) => !!msg && /life_(mission|vision|statement)/.test(msg)

// `ready` is false when the database hasn't been updated yet
export async function loadLifeStatement(supabase: SupabaseClient, userId: string): Promise<{ life: LifeStatement; ready: boolean }> {
  const { data, error } = await supabase.from('user_preferences').select(COLS).eq('user_id', userId).maybeSingle()
  if (error) return { life: EMPTY_LIFE, ready: !isMissing(error.message) }
  const row = data as { life_mission?: string | null; life_vision?: string | null; life_statement_updated_at?: string | null } | null
  return {
    life: {
      mission: row?.life_mission ?? '',
      vision: row?.life_vision ?? '',
      updatedAt: row?.life_statement_updated_at ?? null,
    },
    ready: true,
  }
}

export type LifeSaveResult = 'ok' | 'needs-update' | 'error'

export async function saveLifeStatement(supabase: SupabaseClient, userId: string, mission: string, vision: string, now = new Date()): Promise<{ result: LifeSaveResult; life?: LifeStatement }> {
  const clean = { mission: tidy(mission), vision: tidy(vision) }
  const updatedAt = now.toISOString()
  // Upsert only touches these columns, so the themes and other preferences are kept
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    life_mission: clean.mission || null,
    life_vision: clean.vision || null,
    life_statement_updated_at: updatedAt,
  })
  if (error) return { result: isMissing(error.message) ? 'needs-update' : 'error' }
  return { result: 'ok', life: { ...clean, updatedAt } }
}

// Trim, drop trailing spaces on each line, and allow at most one blank line in a row
export function tidy(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n').map(l => l.trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS)
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)

// ── Gentle guidance for the editor (nothing here blocks saving) ──

export const GUIDE = {
  mission: {
    label: 'Life mission',
    question: 'Why do you exist, and how do you live it out?',
    hint: 'Write it in the present tense: who you serve, what you give, and why.',
    prompts: ['Who am I called to serve?', 'What gifts has God given me?', 'What do I do, and why does it matter?'],
    starter: 'I exist to ___ by ___, so that ___.',
    example: 'I exist to raise faithful leaders by teaching and walking with young people, so that they know God and serve their generation.',
    // Short enough to remember and say out loud
    softLimit: 60,
    longNote: 'Shorter is easier to remember. Aim for one or two sentences.',
  },
  vision: {
    label: 'Life vision',
    question: 'What future are you working toward?',
    hint: 'Describe it as if you can already see it: who you are, what you have built, what has changed.',
    prompts: ['In 10 years, what does my life look like?', 'What has changed because of me?', 'What will people say of my life?'],
    starter: 'I see a future where ___.',
    example: 'I see a family that loves God, a school that trains a thousand leaders, and a life marked by generosity and peace.',
    softLimit: 150,
    longNote: 'A vision reads best as a short, vivid picture. Keep the detail for your yearly visions.',
  },
} as const

export type LifeField = keyof typeof GUIDE

export function lengthNote(field: LifeField, text: string) {
  if (/_{3,}/.test(text)) return 'Fill in the blanks (___) with your own words.'
  return wordCount(text) > GUIDE[field].softLimit ? GUIDE[field].longNote : null
}

// Insert the starter only into an empty box, so nothing written is ever overwritten
export function withStarter(field: LifeField, text: string) {
  return text.trim() ? text : GUIDE[field].starter
}
