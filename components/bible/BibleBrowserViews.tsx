'use client'

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { ChevronRight, Check, Globe, Search, BookMarked, X, Loader2, BookOpen, Brain, CheckCircle2, CalendarCheck, History } from 'lucide-react'
import { BOOK_GROUPS, groupOf, isOldTestamentBook } from './bookGroups'
import { escapeRegExp, normalizeForSearch, type SearchHit } from '@/lib/bible/source'
import { BOOKS, TRANSLATIONS, displayBook, chapterArray, type SavedVerse, isFrench } from './bibleConstants'
import type { BibleView } from './useBibleReader'

// ── Search View ───────────────────────────────────────────────────────────
interface SearchProps {
  searching: boolean
  searchQuery: string
  searchResults: SearchHit[]
  searchMode: 'reference' | 'words' | null
  searchError: string | null
  searchNotice: string | null
  searchScope: 'book' | 'bible'
  setSearchScope: (s: 'book' | 'bible') => void
  wholeBibleReady: boolean
  searchesOtherTranslation: boolean
  selectedBook: string
  translation: string
  openPassage: (book: string, chapter: number) => void
}

// Marks the start of each word that matched, ignoring case and accents
// ("eternel" highlights "Éternel"), the same way the search matches
function highlightWords(text: string, query: string) {
  const words = normalizeForSearch(query).split(/[^\p{L}\p{N}']+/u).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean)
  if (words.length === 0) return text
  // Normalized copy of the text, remembering where each character came from
  let norm = ''
  const origin: number[] = []
  for (let i = 0; i < text.length; i++) {
    const n = normalizeForSearch(text[i])
    for (let k = 0; k < n.length; k++) { norm += n[k]; origin.push(i) }
  }
  const marks: [number, number][] = []
  for (const w of words) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(w)})`, 'gu')
    for (const m of norm.matchAll(re)) {
      const start = (m.index ?? 0) + m[1].length
      const end = start + m[2].length
      marks.push([origin[start], (origin[end - 1] ?? text.length - 1) + 1])
    }
  }
  if (marks.length === 0) return text
  marks.sort((x, y) => x[0] - y[0])
  const parts: ReactNode[] = []
  let pos = 0
  for (const [from, to] of marks) {
    if (from < pos) continue
    if (from > pos) parts.push(text.slice(pos, from))
    parts.push(<mark key={from} className="bg-amber-200/80 dark:bg-amber-500/30 rounded px-0.5">{text.slice(from, to)}</mark>)
    pos = to
  }
  parts.push(text.slice(pos))
  return parts
}

const PAGE_SIZE = 100
const isOldTestament = (book: string) => BOOKS.indexOf(book) < 39

export function BibleSearchView({
  searching, searchQuery, searchResults, searchMode, searchError, searchNotice, searchScope, setSearchScope,
  wholeBibleReady, searchesOtherTranslation, selectedBook, translation, openPassage,
}: SearchProps) {
  const isWords = searchMode === 'words'
  const [testament, setTestament] = useState<'all' | 'ot' | 'nt'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  // A new search starts from the top
  useEffect(() => { setVisible(PAGE_SIZE); setTestament('all') }, [searchResults])

  const counts = useMemo(() => {
    const ot = searchResults.filter(v => isOldTestament(v.book)).length
    return { ot, nt: searchResults.length - ot }
  }, [searchResults])
  const filtered = useMemo(() => (
    testament === 'all' ? searchResults
      : searchResults.filter(v => isOldTestament(v.book) === (testament === 'ot'))
  ), [searchResults, testament])
  const showTestaments = isWords && searchScope === 'bible' && counts.ot > 0 && counts.nt > 0
  return (
    <div className="px-4 pt-4 space-y-2">
      {!searchQuery.trim() && (
        <div className="text-center text-muted-foreground py-10 text-sm space-y-1">
          <p>Type a reference like <span className="font-semibold text-foreground">John 3:16</span> or <span className="font-semibold text-foreground">Psalm 23</span>,</p>
          <p>or words like <span className="font-semibold text-foreground">shepherd</span> to search the text.</p>
        </div>
      )}

      {isWords && searchQuery.trim() && (
        <div className="space-y-1.5 pb-1">
          <div className="flex bg-muted rounded-2xl p-1 gap-1">
            {(['book', 'bible'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => setSearchScope(scope)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${searchScope === scope ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                {scope === 'book' ? `In ${displayBook(selectedBook, translation)}` : 'Whole Bible'}
              </button>
            ))}
          </div>
          {searchScope === 'bible' && !wholeBibleReady && (
            <p className="text-[11px] text-muted-foreground px-1">The first whole-Bible search downloads the full text once (about 9 MB), then works offline.</p>
          )}
          {searchesOtherTranslation && (
            <p className="text-[11px] text-muted-foreground px-1">Word search uses the KJV text for this version.</p>
          )}
        </div>
      )}

      {searching && (
        <div className="flex flex-col items-center gap-2 py-10">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          {isWords && searchScope === 'bible' && !wholeBibleReady && (
            <p className="text-xs text-muted-foreground">Getting the Bible text ready for search (first time only)…</p>
          )}
        </div>
      )}
      {!searching && searchNotice && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">{searchNotice}</p>
      )}
      {!searching && searchError && (
        <p className="text-center text-destructive py-10 text-sm">{searchError}</p>
      )}
      {!searching && !searchError && searchQuery.trim() && searchResults.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">
          {isWords && searchQuery.trim().length < 3 ? 'Type at least 3 letters.' : 'No results.'}
        </p>
      )}
      {!searching && isWords && searchResults.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] text-muted-foreground shrink-0">
            {filtered.length.toLocaleString()} verse{filtered.length !== 1 ? 's' : ''}
          </p>
          {showTestaments && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {([['all', 'All'], ['ot', `Old · ${counts.ot}`], ['nt', `New · ${counts.nt}`]] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => { setTestament(value); setVisible(PAGE_SIZE) }}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    testament === value ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!searching && filtered.slice(0, visible).map((v, i) => (
        <button
          key={`${v.book}-${v.chapter}-${v.verse}-${i}`}
          onClick={() => openPassage(v.book, v.chapter)}
          className="w-full text-left rounded-2xl bg-card border border-border p-4 space-y-1 active:bg-muted/60 transition-colors"
        >
          <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
            {displayBook(v.book, translation)} {v.chapter}:{v.verse}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{isWords ? highlightWords(v.text, searchQuery) : v.text}</p>
        </button>
      ))}
      {!searching && filtered.length > visible && (
        <button
          onClick={() => setVisible(n => n + PAGE_SIZE)}
          className="w-full py-3 rounded-2xl border border-border text-sm font-bold text-violet-600 dark:text-violet-400 active:bg-muted/60"
        >
          Show more ({(filtered.length - visible).toLocaleString()} left)
        </button>
      )}
    </div>
  )
}

// ── Saved Verses View ─────────────────────────────────────────────────────
interface SavedProps {
  savedVerses: SavedVerse[]
  translation: string
  openPassage: (book: string, chapter: number) => void
  setAsMemoryVerse: (v: SavedVerse) => void
}

export function BibleSavedView({ savedVerses, translation, openPassage, setAsMemoryVerse }: SavedProps) {
  return (
    <div className="px-4 pt-4 space-y-3">
      {savedVerses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BookMarked className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">No saved verses yet</p>
          <p className="text-xs">Tap the bookmark on any verse to save it</p>
        </div>
      )}
      {savedVerses.map(v => (
        <div key={v.id} className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <button onClick={() => openPassage(v.book, v.chapter)} className="w-full text-left space-y-1">
            <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest">
              {displayBook(v.book, translation)} {v.chapter}:{v.verse}
            </p>
            <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{v.text.trim()}&rdquo;</p>
          </button>
          <div className="flex gap-2">
            <button onClick={() => openPassage(v.book, v.chapter)} className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground active:scale-95">
              <BookOpen className="w-3.5 h-3.5" /> Read chapter
            </button>
            <button onClick={() => setAsMemoryVerse(v)} className="flex items-center gap-1 rounded-xl bg-violet-100 dark:bg-violet-900/40 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 active:scale-95">
              <Brain className="w-3.5 h-3.5" /> Memory verse
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Version Picker ────────────────────────────────────────────────────────
interface VersionProps {
  versionLang: 'all' | 'en' | 'fr'
  setVersionLang: Dispatch<SetStateAction<'all' | 'en' | 'fr'>>
  translation: string
  setTranslation: (t: string) => void
  setView: (v: BibleView) => void
}

export function BibleVersionPicker({ versionLang, setVersionLang, translation, setTranslation, setView }: VersionProps) {
  return (
    <div className="pb-10">
      <div className="px-4 pt-3 pb-4">
        <button
          onClick={() => setVersionLang(l => l === 'fr' ? 'en' : l === 'en' ? 'all' : 'fr')}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted active:bg-muted/70 transition"
        >
          <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left text-base font-medium">Language</span>
          <span className="text-sm text-muted-foreground font-medium">
            {versionLang === 'fr' ? 'Français' : versionLang === 'en' ? 'English' : 'All'}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </button>
      </div>
      <p className="px-4 text-[13px] font-bold text-foreground mb-1">Available</p>
      <div className="divide-y divide-border">
        {TRANSLATIONS
          .filter(t =>
            versionLang === 'all' ? true
              : versionLang === 'fr' ? isFrench(t.id)
              : !isFrench(t.id)
          )
          .map(t => (
            <button
              key={t.id}
              onClick={() => { setTranslation(t.id); setView('books') }}
              className="w-full flex items-center gap-3 px-6 py-4 text-left active:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-black text-[15px] leading-snug">{t.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{t.name}</p>
              </div>
              {translation === t.id
                ? <Check className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              }
            </button>
          ))}
      </div>
    </div>
  )
}

// ── Book Browser (Bible home) ─────────────────────────────────────────────
interface BookBrowserProps {
  lastRead: { book: string; chapter: number } | null
  openPassage: (book: string, chapter: number) => void
  bookProgress: (book: string) => { read: number; total: number }
  bookSearch: string
  setBookSearch: (q: string) => void
  showRecent: boolean
  setShowRecent: Dispatch<SetStateAction<boolean>>
  bookSort: 'canonical' | 'alpha'
  setBookSort: Dispatch<SetStateAction<'canonical' | 'alpha'>>
  displayedBooks: string[]
  openBook: (book: string) => void
  translation: string
  savedCount: number
  setView: (v: BibleView) => void
}

type Testament = 'all' | 'ot' | 'nt'

export function BibleBookBrowser({
  lastRead, openPassage, bookProgress,
  bookSearch, setBookSearch, showRecent, setShowRecent, bookSort, setBookSort,
  displayedBooks, openBook, translation, savedCount, setView,
}: BookBrowserProps) {
  const [testament, setTestament] = useState<Testament>('all')
  const fr = isFrench(translation)
  const versionLabel = TRANSLATIONS.find(t => t.id === translation)?.label ?? 'KJV'

  const books = displayedBooks.filter(b =>
    testament === 'all' || (testament === 'ot') === isOldTestamentBook(b))
  // Sections only make sense in Bible order with nothing narrowing the list
  const grouped = bookSort === 'canonical' && !showRecent && !bookSearch.trim()
  const sections = grouped
    ? BOOK_GROUPS
        .map(g => ({ group: g, books: books.filter(b => groupOf(b).id === g.id) }))
        .filter(s => s.books.length > 0)
    : [{ group: null, books }]

  const continueProgress = lastRead ? bookProgress(lastRead.book) : null
  const tiles = [
    { icon: Search, label: fr ? 'Rechercher' : 'Search', onClick: () => setView('search'), tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10', badge: undefined as number | undefined },
    { icon: BookMarked, label: fr ? 'Favoris' : 'Saved', onClick: () => setView('saved'), tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10', badge: savedCount || undefined },
    { icon: CalendarCheck, label: 'Plans', onClick: () => setView('plans'), tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', badge: undefined },
    { icon: Globe, label: versionLabel, onClick: () => setView('versions'), tone: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10', badge: undefined },
  ]

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      {/* Continue reading */}
      {!bookSearch && (
        <button
          onClick={() => (lastRead ? openPassage(lastRead.book, lastRead.chapter) : openBook('John'))}
          className="relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-left text-white shadow-lg shadow-violet-500/20 active:scale-[0.99] transition"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <BookOpen className="absolute right-5 bottom-4 h-16 w-16 text-white/10" aria-hidden />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {lastRead ? (fr ? 'Reprendre la lecture' : 'Continue reading') : (fr ? 'Commencer' : 'Start reading')}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {lastRead ? `${displayBook(lastRead.book, translation)} ${lastRead.chapter}` : displayBook('John', translation)}
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              {lastRead
                ? `${groupOf(lastRead.book)[fr ? 'fr' : 'en']} · ${versionLabel}`
                : (fr ? 'Un bon début : l’Évangile de Jean' : 'A good place to begin: the Gospel of John')}
            </p>
            {continueProgress && continueProgress.read > 0 && (
              <div className="mt-4 max-w-[75%]">
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.round((continueProgress.read / continueProgress.total) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-white/80">
                  {continueProgress.read} / {continueProgress.total} {fr ? 'chapitres lus' : 'chapters read'}
                </p>
              </div>
            )}
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-violet-700">
              {fr ? 'Lire' : 'Read'} <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </button>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {tiles.map(({ icon: Icon, label, onClick, tone, badge }) => (
          <button key={label} onClick={onClick} className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card py-3 active:scale-95 transition">
            <span className={`h-9 w-9 rounded-xl grid place-items-center ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
            <span className="text-[11px] font-bold truncate max-w-full px-1">{label}</span>
            {badge !== undefined && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black grid place-items-center">{badge > 99 ? '99+' : badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Find a book */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={bookSearch}
            onChange={e => setBookSearch(e.target.value)}
            placeholder={fr ? 'Trouver un livre' : 'Find a book'}
            className="w-full rounded-2xl bg-muted/60 pl-10 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
          />
          {bookSearch && (
            <button onClick={() => setBookSearch('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button onClick={() => { setTestament('all'); setShowRecent(false) }} className={chip(testament === 'all' && !showRecent)}>{fr ? 'Tous' : 'All'}</button>
          <button onClick={() => { setTestament('ot'); setShowRecent(false) }} className={chip(testament === 'ot' && !showRecent)}>{fr ? 'Ancien Testament' : 'Old Testament'}</button>
          <button onClick={() => { setTestament('nt'); setShowRecent(false) }} className={chip(testament === 'nt' && !showRecent)}>{fr ? 'Nouveau Testament' : 'New Testament'}</button>
          <button onClick={() => { setShowRecent(v => !v); setTestament('all') }} className={`${chip(showRecent)} flex items-center gap-1`}>
            <History className="h-3.5 w-3.5" /> {fr ? 'Récents' : 'Recent'}
          </button>
          <button onClick={() => setBookSort(s => (s === 'canonical' ? 'alpha' : 'canonical'))} className={chip(bookSort === 'alpha')}>A–Z</button>
        </div>
      </div>

      {/* Books */}
      {books.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">
          {showRecent ? (fr ? 'Aucun livre récent' : 'No recent books yet') : (fr ? 'Aucun livre trouvé' : 'No books found')}
        </p>
      ) : sections.map(({ group, books: list }) => (
        <section key={group?.id ?? 'flat'} className="space-y-2">
          {group && (
            <div className="flex items-center gap-2 px-1 pt-1">
              <span className={`h-2 w-2 rounded-full ${group.dot}`} />
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{group[fr ? 'fr' : 'en']}</h3>
              <span className="text-[11px] font-semibold text-muted-foreground/60">{list.length}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {list.map(book => {
              const g = groupOf(book)
              const { read, total } = bookProgress(book)
              const done = read > 0 && read === total
              const isCurrent = lastRead?.book === book
              return (
                <button
                  key={book}
                  onClick={() => openBook(book)}
                  className={`relative overflow-hidden rounded-2xl border bg-card p-3 text-left active:scale-[0.98] transition ${
                    isCurrent ? 'border-violet-400 dark:border-violet-600' : 'border-border'
                  }`}
                >
                  <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${g.bar}`} aria-hidden />
                  <div className="pl-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[15px] font-bold leading-tight truncate">{displayBook(book, translation)}</p>
                      {done && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-label="Book read" />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {read > 0 && !done ? `${read}/${total}` : total} {total === 1 ? (fr ? 'chapitre' : 'chapter') : (fr ? 'chapitres' : 'chapters')}
                    </p>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : g.bar}`} style={{ width: `${total ? Math.round((read / total) * 100) : 0}%` }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ── Chapter Browser ───────────────────────────────────────────────────────
interface ChapterBrowserProps {
  readChapters: Set<string>
  selectedBook: string
  selectedChapter: number
  openChapter: (ch: number) => void
  translation: string
}

export function BibleChapterBrowser({ readChapters, selectedBook, selectedChapter, openChapter, translation }: ChapterBrowserProps) {
  const fr = isFrench(translation)
  const chapters = chapterArray(selectedBook)
  const g = groupOf(selectedBook)
  const isRead = (ch: number) => readChapters.has(`${selectedBook}-${ch}`)
  const readCount = chapters.filter(isRead).length
  const pct = chapters.length ? Math.round((readCount / chapters.length) * 100) : 0
  // Pick up at the first chapter not read yet
  const next = chapters.find(ch => !isRead(ch)) ?? 1

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <div className={`rounded-[28px] p-5 ${g.soft}`}>
        <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${g.text}`}>
          {g[fr ? 'fr' : 'en']} · {isOldTestamentBook(selectedBook) ? (fr ? 'Ancien Testament' : 'Old Testament') : (fr ? 'Nouveau Testament' : 'New Testament')}
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{displayBook(selectedBook, translation)}</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-background/70 overflow-hidden">
            <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : g.bar}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums">{readCount}/{chapters.length}</span>
        </div>
        <button
          onClick={() => openChapter(next)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-black text-background active:scale-95 transition"
        >
          <BookOpen className="h-4 w-4" />
          {readCount === 0
            ? (fr ? 'Commencer au chapitre 1' : 'Start at chapter 1')
            : pct === 100 ? (fr ? 'Relire depuis le début' : 'Read again from the start')
            : `${fr ? 'Continuer au chapitre' : 'Continue at chapter'} ${next}`}
        </button>
      </div>

      <div>
        <p className="px-1 mb-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {fr ? 'Chapitres' : 'Chapters'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {chapters.map(ch => {
            const read = isRead(ch)
            const current = ch === selectedChapter
            return (
              <button
                key={ch}
                onClick={() => openChapter(ch)}
                aria-label={read ? `Chapter ${ch}, read` : `Chapter ${ch}`}
                className={`relative aspect-square rounded-2xl text-[15px] font-bold grid place-items-center transition active:scale-90 ${
                  current
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                    : read
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-card border border-border'
                }`}
              >
                {ch}
                {read && !current && <Check className="absolute top-1 right-1 h-3 w-3 text-emerald-500" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-600" /> {fr ? 'Actuel' : 'Current'}</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-500/30" /> {fr ? 'Lu' : 'Read'}</span>
        </div>
      </div>
    </div>
  )
}
