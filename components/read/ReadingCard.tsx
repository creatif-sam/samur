'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { JSX, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Cross,
  Brain,
  Hammer,
  ScrollText,
  Sparkles,
  Crown,
  Timer,
  Layers,
  Trash2,
  MoreVertical,
  Pencil,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Reading } from '@/lib/read/reading'
import ReadingLogForm from './ReadingLogForm'

type ReadingStatus =
  | 'to_read'
  | 'reading'
  | 'done'
  | 'applied'

type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous'

const statusMeta: Record<
  ReadingStatus,
  { label: string; icon: JSX.Element }
> = {
  to_read: { label: 'To read', icon: <BookOpen className="w-4 h-4" /> },
  reading: { label: 'Reading', icon: <BookMarked className="w-4 h-4" /> },
  done: { label: 'Done', icon: <CheckCircle className="w-4 h-4" /> },
  applied: { label: 'Applied', icon: <Lightbulb className="w-4 h-4" /> },
}

const categoryMeta: Record<
  ReadingCategory,
  { label: string; icon: JSX.Element; className: string }
> = {
  faith: {
    label: 'Faith',
    icon: <Cross className="w-3 h-3" />,
    className: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  self_development: {
    label: 'Self dev',
    icon: <Sparkles className="w-3 h-3" />,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  skill: {
    label: 'Skill',
    icon: <Hammer className="w-3 h-3" />,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  philosophy: {
    label: 'Philosophy',
    icon: <ScrollText className="w-3 h-3" />,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  psychology: {
    label: 'Psychology',
    icon: <Brain className="w-3 h-3" />,
    className: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  leadership: {
    label: 'Leadership',
    icon: <Crown className="w-3 h-3" />,
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  productivity: {
    label: 'Productivity',
    icon: <Timer className="w-3 h-3" />,
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  miscellaneous: {
    label: 'Misc',
    icon: <Layers className="w-3 h-3" />,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
}

interface Props {
  reading: Reading
  onLogged?: () => void
  onEdit?: (reading: Reading) => void
}


export default function ReadingCard({
  reading,
  onLogged,
  onEdit,
}: Props): JSX.Element {
  const { tr } = useTranslation()
  const [status, setStatus] = useState<ReadingStatus>(reading.status)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const pagesRead =
    reading.total_pages - reading.pages_remaining

  const updateStatus = async (value: ReadingStatus) => {
    const previous = status
    setStatus(value) // optimistic
    const supabase = createClient()
    const { error } = await supabase
      .from('readings')
      .update({ status: value })
      .eq('id', reading.id)
    
    if (error) {
      setStatus(previous) // rollback
      toast.error(tr('Failed to update status'))
    } else {
      toast.success(tr('Status updated!'))
      onLogged?.() // refresh counts and shelves
    }
  }

  const deleteReading = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('readings')
      .delete()
      .eq('id', reading.id)
    
    if (error) {
      toast.error(tr('Failed to delete book'))
    } else {
      toast.success(tr('Book deleted successfully'))
      onLogged?.()
    }
    setShowDeleteDialog(false)
  }

  return (
    <>
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{tr(reading.title)}</h3>
          {reading.author && (
            <p className="text-sm text-muted-foreground">
              {reading.author}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1 items-end">
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${categoryMeta[reading.category].className}`}
            >
              {categoryMeta[reading.category].icon}
              {tr(categoryMeta[reading.category].label)}
            </Badge>

            <Badge variant="secondary" className="flex items-center gap-1">
              {statusMeta[status].icon}
              {tr(statusMeta[status].label)}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(reading)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {tr('Edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {tr('Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{tr('Read {pagesRead} pages', { pagesRead: pagesRead })}</span>
        <span>{tr('{pages_remaining} left', { pages_remaining: reading.pages_remaining })}</span>
      </div>

      {reading.pages_remaining > 0 && (
        <ReadingLogForm
          book={{ ...reading, status }}
          onLogged={next => { if (next !== status) setStatus(next); onLogged?.() }}
        />
      )}

      <Select
        value={status}
        onValueChange={v =>
          updateStatus(v as ReadingStatus)
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="to_read">{tr('To read')}</SelectItem>
          <SelectItem value="reading">{tr('Reading')}</SelectItem>
          <SelectItem value="done">{tr('Done')}</SelectItem>
          <SelectItem value="applied">{tr('Applied')}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('Delete this book?')}</DialogTitle>
          <DialogDescription>
            {tr('This will permanently delete “{title}” and all reading logs. This action cannot be undone.', { title: reading.title })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start gap-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            {tr('Cancel')}
          </Button>
          <Button variant="destructive" onClick={deleteReading}>
            {tr('Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
