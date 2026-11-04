import type { SupabaseClient } from '@supabase/supabase-js'
import { daysBetween, parseDateKey, toLocalDateKey } from '@/lib/dates'

export interface Themes {
  yearTheme: string
  yearScripture: string
  monthTheme: string
  monthScripture: string
  // Year the theme is for, and the day you began walking in it (may be before Jan 1)
  themeYear: number | null
  themeStart: string | null
}

export const EMPTY_THEMES: Themes = {
  yearTheme: '', yearScripture: '', monthTheme: '', monthScripture: '', themeYear: null, themeStart: null,
}

const BASE_COLS = 'year_theme, year_scripture, month_theme, month_scripture'
const YEAR_COLS = 'year_theme_year, year_theme_start'

type Row = Record<string, string | number | null | undefined>

function fromRow(data: Row | null): Themes {
  return {
    yearTheme: (data?.year_theme as string) ?? '',
    yearScripture: (data?.year_scripture as string) ?? '',
    monthTheme: (data?.month_theme as string) ?? '',
    monthScripture: (data?.month_scripture as string) ?? '',
    themeYear: typeof data?.year_theme_year === 'number' ? data.year_theme_year : null,
    themeStart: typeof data?.year_theme_start === 'string' ? data.year_theme_start.slice(0, 10) : null,
  }
}

// Reads the themes; still works if the year/start columns haven't been added yet
export async function loadThemes(supabase: SupabaseClient, userId: string, extraCols = ''): Promise<{ themes: Themes; row: Row | null }> {
  const extra = extraCols ? `, ${extraCols}` : ''
  const full = await supabase.from('user_preferences').select(`${BASE_COLS}, ${YEAR_COLS}${extra}`).eq('user_id', userId).maybeSingle()
  if (!full.error) return { themes: fromRow(full.data as Row | null), row: full.data as Row | null }
  const basic = await supabase.from('user_preferences').select(`${BASE_COLS}${extra}`).eq('user_id', userId).maybeSingle()
  return { themes: fromRow(basic.data as Row | null), row: basic.data as Row | null }
}

// Saves the themes. Returns 'ok', 'partial' (saved, but the start date columns are missing) or 'error'.
export async function saveThemes(supabase: SupabaseClient, userId: string, t: Themes): Promise<'ok' | 'partial' | 'error'> {
  const base = {
    user_id: userId,
    year_theme: t.yearTheme,
    year_scripture: t.yearScripture,
    month_theme: t.monthTheme,
    month_scripture: t.monthScripture,
  }
  const full = await supabase.from('user_preferences').upsert({ ...base, year_theme_year: t.themeYear, year_theme_start: t.themeStart })
  if (!full.error) return 'ok'
  // Column missing (migration not applied yet): keep the words at least
  if (/year_theme_(year|start)/.test(full.error.message)) {
    const basic = await supabase.from('user_preferences').upsert(base)
    return basic.error ? 'error' : 'partial'
  }
  return 'error'
}

export interface ThemeSpan {
  year: number
  start: string
  end: string
  earlyStart: boolean      // began before Jan 1 of its year
  status: 'upcoming' | 'active' | 'ended'
  day: number              // day number since the start (1 = first day)
  totalDays: number
  daysLeft: number
  daysUntil: number        // for upcoming themes
  pct: number
}

// The stretch of time a year theme covers: from its start day to Dec 31 of its year
export function themeSpan(themeYear: number | null, themeStart: string | null, todayKey = toLocalDateKey(new Date())): ThemeSpan {
  const year = themeYear ?? Number(todayKey.slice(0, 4))
  const end = `${year}-12-31`
  let start = themeStart ?? `${year}-01-01`
  if (start > end) start = `${year}-01-01`
  const totalDays = daysBetween(start, end) + 1
  const status = todayKey < start ? 'upcoming' : todayKey > end ? 'ended' : 'active'
  const day = Math.min(totalDays, Math.max(0, daysBetween(start, todayKey) + 1))
  return {
    year, start, end,
    earlyStart: start < `${year}-01-01`,
    status,
    day,
    totalDays,
    daysLeft: Math.max(0, daysBetween(todayKey, end)),
    daysUntil: Math.max(0, daysBetween(todayKey, start)),
    pct: status === 'upcoming' ? 0 : status === 'ended' ? 100 : Math.round((day / totalDays) * 100),
  }
}

export function formatThemeDate(key: string) {
  return parseDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
