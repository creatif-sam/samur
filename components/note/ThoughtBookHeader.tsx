import { ChevronLeft, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Notebook, Section } from './types'

type ThoughtBookHeaderProps = {
  activeNotebook: Notebook | null
  activeSection: Section | null
  onBack: () => void
  onAdd: () => void
  isProcessing: boolean
}

export function ThoughtBookHeader({ activeNotebook, activeSection, onBack, onAdd, isProcessing }: ThoughtBookHeaderProps) {
  if (!activeNotebook) return null;
  return (
    <header className="px-4 py-4 bg-[#7719aa] dark:bg-[#7c3aed] text-white flex items-center justify-between sticky top-0 z-20 shadow-md">
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white h-12 w-12 shrink-0 rounded-full hover:bg-white/10"><ChevronLeft className="w-8 h-8" /></Button>
        <h2 className="text-sm font-semibold uppercase truncate tracking-wide">{activeSection ? activeSection.title : activeNotebook.title}</h2>
      </div>
      <Button onClick={onAdd} disabled={isProcessing} className="bg-white text-[#7719aa] dark:text-[#7c3aed] font-semibold text-[10px] uppercase rounded-full px-5 h-10 active:scale-95">
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus size={16} className="mr-1" /> {activeSection ? 'Page' : 'Section'}</>}
      </Button>
    </header>
  )
}