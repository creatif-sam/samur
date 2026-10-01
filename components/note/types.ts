export type Page = {
  id: string
  section_id: string
  title: string
  content: string | null
  created_at: string
  updated_at: string | null
}

export type Section = {
  id: string
  notebook_id: string
  title: string
  created_at: string
  pages: Page[]
}

export type Notebook = {
  id: string
  user_id: string
  title: string
  emoji: string | null
  color: string | null
  pinned: boolean | null
  created_at: string
  sections: Section[]
}

export type PagePatch = Pick<Page, 'id'> & Partial<Omit<Page, 'id'>>

/** Placeholder titles given to new pages; a page with one of these and no body counts as empty. */
export const PLACEHOLDER_TITLES = ['', 'untitled', 'untitled page']

export const MAX_PINNED_NOTEBOOKS = 3

export function pageSortTime(page: Page) {
  return new Date(page.updated_at ?? page.created_at).getTime()
}
