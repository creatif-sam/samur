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
  // Month the month theme is for ('YYYY-MM'); it stops showing once that month is over
  themeMonth: string | null
}

export const EMPTY_THEMES: Themes = {
  yearTheme: '', yearScripture: '', monthTheme: '', monthScripture: '', themeYear: null, themeStart: null, themeMonth: null,
}

const BASE_COLS = 'year_theme, year_scripture, month_theme, month_scripture'
// Added by later migrations, in order; each tier is tried before falling back to the one below
const YEAR_COLS = 'year_theme_year, year_theme_start'       // 20261104000000_year_theme_start
const MONTH_COLS = 'month_theme_month'                       // 20261106000000_month_theme_and_answered_prayers
const missing = (msg: string | undefined, re: RegExp) => !!msg && re.test(msg)

type Row = Record<string, string | number | null | undefined>

function fromRow(data: Row | null): Themes {
  return {
    yearTheme: (data?.year_theme as string) ?? '',
    yearScripture: (data?.year_scripture as string) ?? '',
    monthTheme: (data?.month_theme as string) ?? '',
    monthScripture: (data?.month_scripture as string) ?? '',
    themeYear: typeof data?.year_theme_year === 'number' ? data.year_theme_year : null,
    themeStart: typeof data?.year_theme_start === 'string' ? data.year_theme_start.slice(0, 10) : null,
    themeMonth: typeof data?.month_theme_month === 'string' ? data.month_theme_month : null,
  }
}

// Reads the themes. Works whichever migrations have been run: all columns, then
// without the month column, then the original columns only.
export async function loadThemes(supabase: SupabaseClient, userId: string, extraCols = ''): Promise<{ themes: Themes; row: Row | null }> {
  const extra = extraCols ? `, ${extraCols}` : ''
  const tiers = [`${BASE_COLS}, ${YEAR_COLS}, ${MONTH_COLS}`, `${BASE_COLS}, ${YEAR_COLS}`, BASE_COLS]
  let row: Row | null = null
  for (const cols of tiers) {
    const res = await supabase.from('user_preferences').select(`${cols}${extra}`).eq('user_id', userId).maybeSingle()
    if (!res.error) { row = res.data as Row | null; break }
  }
  return { themes: fromRow(row), row }
}

// Saves the themes as fully as the database allows.
// 'ok': everything saved. 'no-month': saved, but the month column is missing.
// 'no-dates': only the words saved (year and month columns missing). 'error': nothing saved.
export type SaveResult = 'ok' | 'no-month' | 'no-dates' | 'error'

export async function saveThemes(supabase: SupabaseClient, userId: string, t: Themes): Promise<SaveResult> {
  const base = {
    user_id: userId,
    year_theme: t.yearTheme,
    year_scripture: t.yearScripture,
    month_theme: t.monthTheme,
    month_scripture: t.monthScripture,
  }
  const withYear = { ...base, year_theme_year: t.themeYear, year_theme_start: t.themeStart }
  const table = () => supabase.from('user_preferences')

  const full = await table().upsert({ ...withYear, month_theme_month: t.themeMonth })
  if (!full.error) return 'ok'
  if (!missing(full.error.message, /month_theme_month|year_theme_(year|start)/)) return 'error'

  // Month column not there yet: keep the year and start date
  if (missing(full.error.message, /month_theme_month/)) {
    const year = await table().upsert(withYear)
    if (!year.error) return 'no-month'
    if (!missing(year.error.message, /year_theme_(year|start)/)) return 'error'
  }

  // Neither newer column set: keep the words at least
  const basic = await table().upsert(base)
  return basic.error ? 'error' : 'no-dates'
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

export const monthKey = (todayKey = toLocalDateKey(new Date())) => todayKey.slice(0, 7)

// The month theme is current only in the month it was set for.
// Without a stored month (database not updated yet) it keeps showing, as before.
export function currentMonthTheme(t: Themes, todayKey = toLocalDateKey(new Date())) {
  const stale = !!t.monthTheme && !!t.themeMonth && t.themeMonth !== monthKey(todayKey)
  return {
    stale,
    theme: stale ? '' : t.monthTheme,
    scripture: stale ? '' : t.monthScripture,
    // What it was, to show as "Last month" when it has gone stale
    previous: stale ? t.monthTheme : '',
  }
}
