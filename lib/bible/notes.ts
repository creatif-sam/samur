// Links Bible Notes pages to verses through their titles ("John 3:16",
// "John 3:16–18", "Jean 3:16, 3:18"), so older notes are found too.

export type VerseNoteLink = { pageId: string; title: string }

const REF_PART = /^(?:(\d+):)?(\d+)(?:\s*[–—-]\s*(\d+))?$/

// The verses of `chapter` a note title covers. `bookNames` are lowercase.
export function parseNoteVerses(title: string, bookNames: string[], chapter: number): number[] {
  const t = title.trim().toLowerCase()
  const name = bookNames
    .filter(n => t.startsWith(n + ' '))
    .sort((a, b) => b.length - a.length)[0]
  if (!name) return []
  const verses: number[] = []
  let current: number | null = null
  for (const part of t.slice(name.length + 1).split(/\s*,\s*/)) {
    const m = part.trim().match(REF_PART)
    if (!m) return verses
    if (m[1]) current = Number(m[1])
    else if (current === null) return verses // a bare number with no chapter isn't a reference
    if (current !== chapter) continue
    const from = Number(m[2])
    const to = m[3] ? Number(m[3]) : from
    for (let v = from; v <= Math.min(to, from + 200); v++) verses.push(v)
  }
  return verses
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s)

// Plain text (paragraphs split by blank lines) as editor HTML
export function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// A note's content (HTML, or plain text from older Bible notes) as readable text
export function noteToText(content: unknown) {
  const s = typeof content === 'string' ? content : ''
  if (!looksLikeHtml(s)) return s.trim()
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<img[^>]*>/gi, '[photo]\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// A new note: the verse quoted, then the user's thoughts
export function newVerseNoteHtml(quote: string, text: string) {
  return `<blockquote>${textToHtml(quote)}</blockquote>${text.trim() ? textToHtml(text) : ''}`
}

// Adds a dated entry at the end of an existing note
export function appendToNoteHtml(existing: unknown, heading: string, text: string, quote?: string) {
  const s = typeof existing === 'string' ? existing : ''
  const base = !s.trim() ? '' : looksLikeHtml(s) ? s : textToHtml(s)
  return `${base}<p><strong>${escapeHtml(heading)}</strong></p>${quote ? `<blockquote>${textToHtml(quote)}</blockquote>` : ''}${textToHtml(text)}`
}
