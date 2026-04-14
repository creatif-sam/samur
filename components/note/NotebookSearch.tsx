'use client'

import { useState, useMemo } from 'react'
import { Search, FileText, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface NotebookSearchProps {
  notebooks: any[]
  onSelectPage: (page: any, section: any, notebook: any) => void
}

export function NotebookSearch({ notebooks, onSelectPage }: NotebookSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Search through all pages in all notebooks
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    const results: Array<{
      page: any
      section: any
      notebook: any
      matchedText: string
    }> = []

    notebooks.forEach(notebook => {
      notebook.sections?.forEach((section: any) => {
        section.pages?.forEach((page: any) => {
          // Search in title
          const titleMatch = page.title?.toLowerCase().includes(query)
          
          // Search in content
          const content = typeof page.content === 'string' 
            ? page.content 
            : JSON.stringify(page.content)
          const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
          const contentMatch = plainContent.toLowerCase().includes(query)

          if (titleMatch || contentMatch) {
            // Get snippet around the match
            let matchedText = ''
            if (titleMatch) {
              matchedText = page.title
            } else {
              const index = plainContent.toLowerCase().indexOf(query)
              const start = Math.max(0, index - 50)
              const end = Math.min(plainContent.length, index + 100)
              matchedText = '...' + plainContent.substring(start, end) + '...'
            }

            results.push({
              page,
              section,
              notebook,
              matchedText
            })
          }
        })
      })
    })

    return results.slice(0, 20) // Limit to 20 results
  }, [searchQuery, notebooks])

  const highlightMatch = (text: string, query: string) => {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    
    if (index === -1) return text

    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 dark:bg-yellow-900/50 font-bold">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    )
  }

  return (
    <div className="relative">
      {/* Search Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-16 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg rounded-xl"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </Button>

      {/* Search Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl overflow-auto">
          <div className="max-w-2xl mx-auto pt-20 px-4 pb-32">
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search your notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-violet-500 dark:focus:border-violet-500"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </p>

                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                    <FileText className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-sm font-semibold">No matching notes found</p>
                    <p className="text-xs mt-2">Try a different search term</p>
                  </div>
                ) : (
                  searchResults.map(({ page, section, notebook, matchedText }, index) => (
                    <button
                      key={`${page.id}-${index}`}
                      onClick={() => {
                        onSelectPage(page, section, notebook)
                        setIsOpen(false)
                        setSearchQuery('')
                      }}
                      className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900 hover:shadow-lg transition-all text-left"
                    >
                      {/* Notebook/Section breadcrumb */}
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: notebook.color || '#7719aa' }}
                        />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {notebook.title} / {section.title}
                        </span>
                      </div>

                      {/* Page title */}
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
                        {highlightMatch(page.title || 'Untitled', searchQuery)}
                      </h4>

                      {/* Matched content snippet */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {highlightMatch(matchedText, searchQuery)}
                      </p>

                      {/* Date */}
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2">
                        Created: {new Date(page.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
