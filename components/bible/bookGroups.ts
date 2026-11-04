import { BOOKS } from './bibleConstants'

// Sections of the Bible, in canonical order, with an accent colour each.
// `from`/`to` are indexes into BOOKS (inclusive).
export const BOOK_GROUPS = [
  { id: 'law', en: 'The Law', fr: 'La Loi', from: 0, to: 4, dot: 'bg-amber-500', bar: 'bg-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  { id: 'history', en: 'History', fr: 'Histoire', from: 5, to: 16, dot: 'bg-orange-500', bar: 'bg-orange-500', soft: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' },
  { id: 'wisdom', en: 'Wisdom & Poetry', fr: 'Sagesse et poésie', from: 17, to: 21, dot: 'bg-rose-500', bar: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400' },
  { id: 'major', en: 'Major Prophets', fr: 'Grands prophètes', from: 22, to: 26, dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-700 dark:text-fuchsia-400' },
  { id: 'minor', en: 'Minor Prophets', fr: 'Petits prophètes', from: 27, to: 38, dot: 'bg-purple-500', bar: 'bg-purple-500', soft: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400' },
  { id: 'gospels', en: 'Gospels & Acts', fr: 'Évangiles et Actes', from: 39, to: 43, dot: 'bg-violet-600', bar: 'bg-violet-600', soft: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400' },
  { id: 'paul', en: "Paul's Letters", fr: 'Épîtres de Paul', from: 44, to: 56, dot: 'bg-indigo-500', bar: 'bg-indigo-500', soft: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
  { id: 'general', en: 'General Letters', fr: 'Épîtres générales', from: 57, to: 64, dot: 'bg-sky-500', bar: 'bg-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400' },
  { id: 'revelation', en: 'Prophecy', fr: 'Prophétie', from: 65, to: 65, dot: 'bg-teal-500', bar: 'bg-teal-500', soft: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400' },
] as const

export type BookGroup = (typeof BOOK_GROUPS)[number]

export function groupOf(book: string): BookGroup {
  const i = BOOKS.indexOf(book)
  return BOOK_GROUPS.find(g => i >= g.from && i <= g.to) ?? BOOK_GROUPS[0]
}

export const isOldTestamentBook = (book: string) => BOOKS.indexOf(book) < 39
