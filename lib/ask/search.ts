// "Ask Mastery": search your own content with a plain question, in English or French.
// Runs on the device over what you've written (no AI service, nothing sent anywhere):
// it ranks entries with BM25, understands dates ("last month", "en novembre") and the
// kind of thing you mean ("prayer", "goal"), and picks the sentence that best answers.

export type DocKind =
  | 'note' | 'post' | 'gratitude' | 'meditation' | 'day' | 'todo'
  | 'prayer' | 'goal' | 'role' | 'rock' | 'life'

export interface AskDoc {
  id: string
  kind: DocKind
  title: string
  text: string
  date: string | null   // YYYY-MM-DD when it happened or was written
  href: string
  where?: string        // e.g. the notebook and section of a note
}

export interface Segment { text: string; hit: boolean }

export interface AskHit {
  doc: AskDoc
  score: number
  snippet: Segment[]    // the best sentence, with the matched words marked
}

export interface DateRange { from: string; to: string; label: string }

export interface AskResult {
  hits: AskHit[]
  terms: string[]
  range: DateRange | null
  kinds: DocKind[]      // kinds the question points at (they rank higher)
}

// ── Words ──

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const STOP = new Set(`
a about above after again all am an and any are as at be because been before being below between both but by
can could did do does doing down during each few for from further had has have having he her here hers herself
him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only
or other our ours out over own same she should so some such than that the their theirs them then there these they
this those through to too under until up very was we were what when where which while who whom why will with would
you your yours yourself did ever tell show find give anything something everything thing things
le la les un une des du de d l au aux et ou mais donc or ni car que qui quoi dont ou est sont etait etre avoir ai
as a avons avez ont je tu il elle on nous vous ils elles me te se mon ma mes ton ta tes son sa ses notre nos votre
vos leur leurs ce cet cette ces dans sur sous avec sans pour par en y ne pas plus moins tres tout tous toute toutes
quand comment pourquoi quel quelle quels quelles est-ce ai-je j m n s t c qu
write wrote written writing say said mention mentioned talk talked think thought feel felt remember find look
ecrit ecrire ecris ecrivais dit dire parle parler parlais mentionne pense penser pensais ressenti trouve trouver cherche
`.split(/\s+/).filter(Boolean))

// A light stemmer for English and French: enough to match "prayed", "praying" and "prayers",
// or "patient" and "patience"
const SUFFIXES = ['issements', 'issement', 'ements', 'ement', 'ments', 'ment', 'ations', 'ation', 'ences', 'ence', 'ances', 'ance', 'ents', 'ent', 'ants', 'ant', 'ings', 'ing', 'ions', 'ion', 'ies', 'ers', 'er', 'ed', 'es', 'ly', 's', 'x', 'e']
export function stem(word: string) {
  let w = word
  for (const s of SUFFIXES) {
    if (w.length - s.length >= 4 && w.endsWith(s)) { w = w.slice(0, -s.length); break }
  }
  return w
}

export function words(text: string) {
  return fold(text).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
}

export function terms(text: string) {
  return words(text).filter(w => w.length > 1 && !STOP.has(w)).map(stem)
}

// ── What kind of thing the question is about ──

const KIND_WORDS: [RegExp, DocKind[]][] = [
  [/^(pray|prie|prier|priere|prayer|intercess|request|sujet|exauc|answer|testimon|temoign)/, ['prayer', 'note']],
  [/^(goal|objecti|target|deliverabl)/, ['goal', 'rock']],
  [/^(rock|caillou|cailloux)/, ['rock']],
  [/^(role)/, ['role', 'goal']],
  [/^(mission|vision|purpose|identit)/, ['life', 'role']],
  [/^(journal|reflect|reflex|intention|mood|humeur)/, ['day', 'post', 'note']],
  [/^(grateful|thank|gratitud|reconnaiss|merci)/, ['gratitude', 'post']],
  [/^(meditat|lesson|revelat|scriptur)/, ['meditation', 'note']],
  [/^(note|notebook|carnet)/, ['note']],
  [/^(post|publicat|shar|partag)/, ['post']],
  [/^(todo|task|tache|faire)/, ['todo', 'day']],
  [/^(event|evenement|plan|schedul|agenda|calend)/, ['day', 'todo']],
]

export function kindHints(question: string): DocKind[] {
  const out = new Set<DocKind>()
  for (const w of words(question)) for (const [re, kinds] of KIND_WORDS) if (re.test(w)) kinds.forEach(k => out.add(k))
  return [...out]
}

// The kinds a word names directly ("goals" -> goal), ahead of related ones (big rocks)
function primaryKinds(question: string): Set<DocKind> {
  const out = new Set<DocKind>()
  for (const w of words(question)) for (const [re, kinds] of KIND_WORDS) if (re.test(w)) out.add(kinds[0])
  return out
}

// ── Dates in the question ──

const pad = (n: number) => String(n).padStart(2, '0')
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const MONTHS: [RegExp, number][] = [
  [/^(january|janvier|jan)$/, 0], [/^(february|fevrier|feb|fev)$/, 1], [/^(march|mars|mar)$/, 2],
  [/^(april|avril|apr|avr)$/, 3], [/^(may|mai)$/, 4], [/^(june|juin|jun)$/, 5], [/^(july|juillet|jul|juil)$/, 6],
  [/^(august|aout|aug)$/, 7], [/^(september|septembre|sept|sep)$/, 8], [/^(october|octobre|oct)$/, 9],
  [/^(november|novembre|nov)$/, 10], [/^(december|decembre|dec)$/, 11],
]

// The period a question mentions ("last week", "le mois dernier", "in March 2026"),
// and the question without those words. Weeks run Sunday to Saturday, as in the planner.
export function parseRange(question: string, now = new Date()): { range: DateRange | null; rest: string } {
  const q = ` ${fold(question).replace(/[^a-z0-9']+/g, ' ')} `
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const shift = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
  const weekStart = shift(today, -today.getDay())
  const rules: [RegExp, () => [Date, Date, string]][] = [
    [/ (today|aujourd'?hui|aujourd hui) /, () => [today, today, 'today']],
    [/ (yesterday|hier) /, () => [shift(today, -1), shift(today, -1), 'yesterday']],
    [/ (last week|la semaine derniere|semaine derniere|past week) /, () => [shift(weekStart, -7), shift(weekStart, -1), 'last week']],
    [/ (this week|cette semaine) /, () => [weekStart, shift(weekStart, 6), 'this week']],
    [/ (last month|le mois dernier|mois dernier|past month) /, () => {
      const a = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return [a, new Date(today.getFullYear(), today.getMonth(), 0), 'last month']
    }],
    [/ (this month|ce mois ci|ce mois) /, () => [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0), 'this month']],
    [/ (last year|l'?annee derniere|annee derniere) /, () => [new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31), 'last year']],
    [/ (this year|cette annee) /, () => [new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31), 'this year']],
  ]
  for (const [re, make] of rules) {
    const m = q.match(re)
    if (m) {
      const [a, b, label] = make()
      return { range: { from: key(a), to: key(b), label }, rest: q.replace(m[0], ' ').trim() }
    }
  }
  // A month name, with an optional year: "in November", "novembre 2025"
  const tokens = q.trim().split(/\s+/)
  for (let i = 0; i < tokens.length; i++) {
    const month = MONTHS.find(([re]) => re.test(tokens[i]))
    if (!month) continue
    // "may" is also a verb: only a month next to "in"/"en"/a year
    if (month[1] === 4 && tokens[i] === 'may' && !/^(in|en|of|de)$/.test(tokens[i - 1] ?? '') && !/^\d{4}$/.test(tokens[i + 1] ?? '')) continue
    const yearTok = tokens[i + 1]
    let year = /^(19|20)\d{2}$/.test(yearTok ?? '') ? Number(yearTok) : today.getFullYear()
    // Without a year, a month later than this one means last year's
    if (!/^(19|20)\d{2}$/.test(yearTok ?? '') && month[1] > today.getMonth()) year--
    const a = new Date(year, month[1], 1)
    const b = new Date(year, month[1] + 1, 0)
    const used = new Set([i, ...(/^(19|20)\d{2}$/.test(yearTok ?? '') ? [i + 1] : [])])
    return {
      range: { from: key(a), to: key(b), label: `${year}-${pad(month[1] + 1)}` },
      rest: tokens.filter((_, j) => !used.has(j)).join(' '),
    }
  }
  return { range: null, rest: question }
}

// ── Snippets ──

// The sentence (or short stretch) that matches the most question words, matches marked
export function snippet(text: string, queryTerms: string[], max = 220): Segment[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const sentences = clean.match(/[^.!?\n]+[.!?]*/g) ?? [clean]
  const want = new Set(queryTerms)
  let best = sentences[0]
  let bestScore = -1
  for (const s of sentences) {
    const found = new Set(terms(s).filter(t => want.has(t)))
    const score = found.size * 10 - Math.abs(s.length - 140) / 50
    if (score > bestScore) { best = s; bestScore = score }
  }
  let piece = best.trim()
  if (piece.length > max) {
    // Keep the part around the first match
    const lower = fold(piece)
    const first = Math.min(...[...want].map(t => { const i = lower.indexOf(t); return i < 0 ? Infinity : i }))
    const start = Number.isFinite(first) ? Math.max(0, first - 60) : 0
    piece = `${start > 0 ? '…' : ''}${piece.slice(start, start + max).trim()}…`
  }
  // Mark each word whose stem was asked for
  const out: Segment[] = []
  const re = /[\p{L}\p{N}]+/gu
  let last = 0
  for (const m of piece.matchAll(re)) {
    const w = m[0]
    const hit = want.has(stem(fold(w))) && !STOP.has(fold(w))
    if (!hit) continue
    if (m.index! > last) out.push({ text: piece.slice(last, m.index), hit: false })
    out.push({ text: w, hit: true })
    last = m.index! + w.length
  }
  if (last < piece.length) out.push({ text: piece.slice(last), hit: false })
  return out
}

// ── The index and the search ──

export interface AskIndex {
  docs: AskDoc[]
  tf: Map<string, number>[]   // per doc: term -> weighted count (title counts double)
  len: number[]
  df: Map<string, number>
  avgLen: number
}

export function buildIndex(docs: AskDoc[]): AskIndex {
  const tf: Map<string, number>[] = []
  const len: number[] = []
  const df = new Map<string, number>()
  for (const d of docs) {
    const m = new Map<string, number>()
    for (const t of terms(d.title)) m.set(t, (m.get(t) ?? 0) + 2)
    let n = 0
    for (const t of terms(d.text)) { m.set(t, (m.get(t) ?? 0) + 1); n++ }
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    tf.push(m)
    len.push(n + terms(d.title).length * 2)
  }
  const avgLen = len.reduce((a, b) => a + b, 0) / Math.max(1, len.length)
  return { docs, tf, len, df, avgLen }
}

// `ignoreDates`: the date words are still left out of the search, but every date is searched
export function search(index: AskIndex, question: string, opts: { now?: Date; kinds?: DocKind[] | null; limit?: number; ignoreDates?: boolean } = {}): AskResult {
  const parsed = parseRange(question, opts.now)
  const rest = parsed.rest
  const range = opts.ignoreDates ? null : parsed.range
  const hinted = kindHints(question)
  const primary = primaryKinds(question)
  // Words that only name a kind ("my prayers") don't have to appear in the entry
  const qTerms = [...new Set(terms(rest))]
  const hintOnly = new Set(words(rest).filter(w => KIND_WORDS.some(([re]) => re.test(w))).map(stem))
  const content = qTerms.filter(t => !hintOnly.has(t))
  const N = index.docs.length
  const k1 = 1.2, b = 0.75
  const scored: AskHit[] = []
  index.docs.forEach((doc, i) => {
    if (opts.kinds && opts.kinds.length && !opts.kinds.includes(doc.kind)) return
    if (range && (!doc.date || doc.date < range.from || doc.date > range.to)) return
    const tf = index.tf[i]
    let score = 0
    let matched = 0      // question words found (not counting words that only name a kind)
    let literal = 0      // any question word found, kind words included
    for (const t of qTerms) {
      let f = tf.get(t) ?? 0
      // A longer word that starts with the asked one ("pray" -> "prayerful") counts a little
      if (!f && t.length >= 4) for (const [w, c] of tf) if (w.startsWith(t)) { f = c * 0.5; break }
      if (!f) continue
      literal++
      if (!hintOnly.has(t)) matched++
      const df = index.df.get(t) ?? 1
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * index.len[i] / index.avgLen))
    }
    if (content.length && matched === 0) return
    if (!content.length && !range && !hinted.length) return
    // A kind word ("grateful") finds entries of that kind, and any entry that says it
    if (hinted.includes(doc.kind)) score = score * (primary.has(doc.kind) ? 2 : 1.5) + (content.length ? 0 : primary.has(doc.kind) ? 2 : 1)
    else if (!content.length && hinted.length && literal === 0) return
    // When nothing but a date or a kind was asked, newer first
    if (!content.length) score += doc.date ? Number(doc.date.replace(/-/g, '')) / 1e9 : 0
    scored.push({ doc, score, snippet: [] })
  })
  scored.sort((a, b) => b.score - a.score || (b.doc.date ?? '').localeCompare(a.doc.date ?? ''))
  const hits = scored.slice(0, opts.limit ?? 30).map(h => ({ ...h, snippet: snippet(h.doc.text || h.doc.title, qTerms) }))
  return { hits, terms: qTerms, range, kinds: hinted }
}
