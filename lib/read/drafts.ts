// Small per-device conveniences for the reading page: unsent note drafts,
// the preferred way of entering progress, and a cache of the library so the
// page shows instantly. All best effort: storage can be unavailable.

const draftKey = (bookId: string) => `reading_note_draft_${bookId}`
const MODE_KEY = 'reading_log_mode'
const LIBRARY_KEY = 'reading_library_cache'

export type LogMode = 'pages' | 'at'

export function loadNoteDraft(bookId: string): string {
  try { return localStorage.getItem(draftKey(bookId)) ?? '' } catch { return '' }
}

export function saveNoteDraft(bookId: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(draftKey(bookId), text)
    else localStorage.removeItem(draftKey(bookId))
  } catch { /* storage unavailable */ }
}

export function loadLogMode(): LogMode {
  try { return localStorage.getItem(MODE_KEY) === 'at' ? 'at' : 'pages' } catch { return 'pages' }
}

export function saveLogMode(mode: LogMode) {
  try { localStorage.setItem(MODE_KEY, mode) } catch { /* storage unavailable */ }
}

export function loadLibraryCache<T>(userId: string): T[] | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? 'null')
    return raw && raw.userId === userId && Array.isArray(raw.readings) ? raw.readings : null
  } catch { return null }
}

export function saveLibraryCache<T>(userId: string, readings: T[]) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify({ userId, readings })) } catch { /* storage unavailable */ }
}

// Turns what was typed into pages read: either a count, or the page you stopped on
export function pagesFromInput(mode: LogMode, input: string, alreadyRead: number): number {
  const n = Math.floor(Number(input))
  if (!n || n <= 0) return 0
  return mode === 'at' ? n - alreadyRead : n
}
