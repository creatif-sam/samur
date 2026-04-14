'use client'

import { FileText, Calendar, Book } from 'lucide-react'

interface RecentPagesGridProps {
  notebooks: any[]
  onSelectPage: (page: any, section: any, notebook: any) => void
}

export function RecentPagesGrid({ notebooks, onSelectPage }: RecentPagesGridProps) {
  // Collect all pages from all notebooks with their metadata
  const allPages: Array<{
    page: any
    section: any
    notebook: any
  }> = []

  notebooks.forEach(notebook => {
    notebook.sections?.forEach((section: any) => {
      section.pages?.forEach((page: any) => {
        allPages.push({ page, section, notebook })
      })
    })
  })

  // Sort by created_at (most recent first)
  const recentPages = allPages
    .sort((a, b) => {
      const dateA = new Date(a.page.created_at).getTime()
      const dateB = new Date(b.page.created_at).getTime()
      return dateB - dateA
    })
    .slice(0, 12) // Show most recent 12 pages

  const getPreviewText = (content: string) => {
    if (!content) return 'Empty page...'
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    return plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (recentPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm font-semibold uppercase tracking-wider">No pages yet</p>
        <p className="text-xs mt-2">Create a notebook to get started</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">
        Recent Pages
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {recentPages.map(({ page, section, notebook }) => (
          <button
            key={page.id}
            onClick={() => onSelectPage(page, section, notebook)}
            className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900 hover:shadow-lg active:scale-[0.97] transition-all text-left overflow-hidden"
          >
            {/* Notebook color accent */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{ backgroundColor: notebook.color || '#7719aa' }}
            />
            
            {/* Page icon */}
            <div className="flex items-center gap-2 mb-2 mt-1">
              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {page.title || 'Untitled'}
                </h4>
              </div>
            </div>

            {/* Preview text */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
              {getPreviewText(page.content)}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-1">
                <Book className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{notebook.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(page.created_at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
