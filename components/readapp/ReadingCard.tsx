'use client'

import { JSX, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  reading: {
    id: string
    title: string
    author?: string
    status: ReadingStatus
    category: ReadingCategory
    total_pages: number
    pages_remaining: number
  }
  onLogged?: () => void
}


export default function ReadingCard({
  reading,
  onLogged,
}: Props): JSX.Element {
  const [status, setStatus] = useState<ReadingStatus>(reading.status)
  const [pages, setPages] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const pagesRead =
    reading.total_pages - reading.pages_remaining

  const updateStatus = async (value: ReadingStatus) => {
    setStatus(value)
    const supabase = createClient()
    const { error } = await supabase
      .from('readings')
      .update({ status: value })
      .eq('id', reading.id)
    
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated!')
    }
  }

  const deleteReading = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('readings')
      .delete()
      .eq('id', reading.id)
    
    if (error) {
      toast.error('Failed to delete book')
    } else {
      toast.success('Book deleted successfully')
      onLogged?.()
    }
    setShowDeleteDialog(false)
  }

  const logToday = async () => {
  const value = Number(pages)
  if (!value || value <= 0) {
    toast.error('Please enter a valid number of pages')
    return
  }
  if (value > reading.pages_remaining) {
    toast.error(`Only ${reading.pages_remaining} pages remaining`)
    return
  }

  setLoading(true)
  const supabase = createClient()

  const { data, error } = await supabase.rpc(
    'log_reading_pages',
    {
      p_reading_id: reading.id,
      p_pages_read: value,
      p_note: note.trim() || null,
    }
  )

  if (error !== null) {
    console.error('RPC failed', error)
    toast.error('Failed to log reading')
    setLoading(false)
    return
  }

  toast.success(`Logged ${value} pages! 📚`)
  setPages('')
  setNote('')
  setLoading(false)
  onLogged?.()
}


  return (
    <>
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{reading.title}</h3>
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
              {categoryMeta[reading.category].label}
            </Badge>

            <Badge variant="secondary" className="flex items-center gap-1">
              {statusMeta[status].icon}
              {statusMeta[status].label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Read {pagesRead} pages</span>
        <span>{reading.pages_remaining} left</span>
      </div>

      {reading.pages_remaining > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max={reading.pages_remaining}
              placeholder="Pages read today"
              value={pages}
              onChange={e => setPages(e.target.value)}
            />
            <Button
              size="sm"
              disabled={loading || !pages}
              onClick={logToday}
            >
              Log
            </Button>
          </div>

          <Input
            placeholder="One phrase or thought"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
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
          <SelectItem value="to_read">To read</SelectItem>
          <SelectItem value="reading">Reading</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this book?</DialogTitle>
          <DialogDescription>
            This will permanently delete "{reading.title}" and all reading logs. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start gap-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={deleteReading}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
