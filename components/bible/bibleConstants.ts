// ── Bible book list (KJV canonical order) ──────────────────────────────────
export const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude',
  'Revelation',
]

export const CHAPTER_COUNTS: Record<string, number> = {
  'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,
  'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,
  '1 Chronicles':29,'2 Chronicles':36,'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,
  'Psalms':150,'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,
  'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,'Joel':3,
  'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,'Habakkuk':3,'Zephaniah':3,
  'Haggai':2,'Zechariah':14,'Malachi':4,'Matthew':28,'Mark':16,'Luke':24,'John':21,
  'Acts':28,'Romans':16,'1 Corinthians':16,'2 Corinthians':13,'Galatians':6,
  'Ephesians':6,'Philippians':4,'Colossians':4,'1 Thessalonians':5,
  '2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,
  'Hebrews':13,'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,
  '3 John':1,'Jude':1,'Revelation':22,
}

export const NT_START = 'Matthew'

// ── French book name display map ─────────────────────────────────────────
export const FRENCH_BOOK_NAMES: Record<string, string> = {
  'Genesis':'Genèse','Exodus':'Exode','Leviticus':'Lévitique','Numbers':'Nombres',
  'Deuteronomy':'Deutéronome','Joshua':'Josué','Judges':'Juges','Ruth':'Ruth',
  '1 Samuel':'1 Samuel','2 Samuel':'2 Samuel','1 Kings':'1 Rois','2 Kings':'2 Rois',
  '1 Chronicles':'1 Chroniques','2 Chronicles':'2 Chroniques','Ezra':'Esdras',
  'Nehemiah':'Néhémie','Esther':'Esther','Job':'Job','Psalms':'Psaumes',
  'Proverbs':'Proverbes','Ecclesiastes':'Ecclésiaste','Song of Solomon':'Cantique des Cantiques',
  'Isaiah':'Ésaïe','Jeremiah':'Jérémie','Lamentations':'Lamentations',
  'Ezekiel':'Ézéchiel','Daniel':'Daniel','Hosea':'Osée','Joel':'Joël',
  'Amos':'Amos','Obadiah':'Abdias','Jonah':'Jonas','Micah':'Michée',
  'Nahum':'Nahoum','Habakkuk':'Habacuc','Zephaniah':'Sophonie','Haggai':'Aggée',
  'Zechariah':'Zacharie','Malachi':'Malachie',
  'Matthew':'Matthieu','Mark':'Marc','Luke':'Luc','John':'Jean','Acts':'Actes',
  'Romans':'Romains','1 Corinthians':'1 Corinthiens','2 Corinthians':'2 Corinthiens',
  'Galatians':'Galates','Ephesians':'Éphésiens','Philippians':'Philippiens',
  'Colossians':'Colossiens','1 Thessalonians':'1 Thessaloniciens',
  '2 Thessalonians':'2 Thessaloniciens','1 Timothy':'1 Timothée','2 Timothy':'2 Timothée',
  'Titus':'Tite','Philemon':'Philémon','Hebrews':'Hébreux','James':'Jacques',
  '1 Peter':'1 Pierre','2 Peter':'2 Pierre','1 John':'1 Jean','2 John':'2 Jean',
  '3 John':'3 Jean','Jude':'Jude','Revelation':'Apocalypse',
}

// ── Available translations ────────────────────────────────────────────────
export const TRANSLATIONS = [
  { id: 'kjv',    label: 'KJV',   name: 'King James Version' },
  { id: 'asv',    label: 'ASV',   name: 'American Standard Version' },
  { id: 'web',    label: 'WEB',   name: 'World English Bible' },
  { id: 'bbe',    label: 'BBE',   name: 'Bible in Basic English' },
  { id: 'ylt',    label: 'YLT',   name: "Young's Literal Translation" },
  { id: 'darby',  label: 'DARBY', name: 'Darby Bible' },
  { id: 'dra',    label: 'DRA',   name: 'Douay-Rheims' },
  { id: 'oeb-us', label: 'OEB',   name: 'Open English Bible' },
  { id: 'lsg',    label: 'LSG',   name: 'Louis Segond (Français)' },
  { id: 'nef',    label: 'NEF',   name: 'Nouvelle Édition de Genève (Français)' },
]

// ── Types ─────────────────────────────────────────────────────────────────
export interface Verse { verse: number; text: string }

export interface SavedVerse {
  id: string; book: string; chapter: number; verse: number; text: string; created_at: string
}

export interface VerseHighlight {
  id: string; book: string; chapter: number; verse: number; color: string
}

// ── Highlight colors ──────────────────────────────────────────────────────
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-200/80 dark:bg-yellow-400/30', dot: 'bg-yellow-400' },
  { id: 'green',  bg: 'bg-green-200/80 dark:bg-green-400/30',   dot: 'bg-green-500' },
  { id: 'blue',   bg: 'bg-blue-200/80 dark:bg-blue-400/30',     dot: 'bg-blue-500' },
  { id: 'pink',   bg: 'bg-pink-200/80 dark:bg-pink-400/30',     dot: 'bg-pink-500' },
  { id: 'purple', bg: 'bg-violet-200/80 dark:bg-violet-400/30', dot: 'bg-violet-500' },
  { id: 'orange', bg: 'bg-orange-200/80 dark:bg-orange-400/30', dot: 'bg-orange-500' },
]

// ── Pure helpers ──────────────────────────────────────────────────────────
export function isFrench(translation: string) {
  return translation === 'lsg' || translation === 'nef'
}

export function displayBook(book: string, translation: string): string {
  return isFrench(translation) ? (FRENCH_BOOK_NAMES[book] ?? book) : book
}

export function highlightBg(color: string): string {
  return HIGHLIGHT_COLORS.find(c => c.id === color)?.bg ?? ''
}

export function apiUrl(book: string, chapter: number, translation: string): string {
  return `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`
}

export function chapterArray(book: string): number[] {
  const n = CHAPTER_COUNTS[book] ?? 1
  return Array.from({ length: n }, (_, i) => i + 1)
}
