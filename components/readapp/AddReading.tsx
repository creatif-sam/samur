'use client'

import { JSX, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, BookPlus } from 'lucide-react'

type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous'

interface Props {
  onCreated: () => void
}

export default function AddReading({ onCreated }: Props): JSX.Element {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [source, setSource] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private')
  const [category, setCategory] = useState<ReadingCategory>('self_development')
  const [loading, setLoading] = useState(false)

  const createReading = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('Please enter a book title')
      return
    }
    const pages = Number(totalPages)
    if (!pages || pages <= 0) {
      toast.error('Please enter a valid number of pages')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      toast.error('Please sign in to add books')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('readings').insert({
      user_id: user.id,
      title: title.trim(),
      author: author.trim() || null,
      source: source.trim() || null,
      category,
      visibility,
      status: 'to_read',
      total_pages: pages,
      pages_remaining: pages,
    })

    if (error) {
      toast.error('Failed to add book')
      setLoading(false)
      return
    }

    toast.success('Book added to shelf! 📚')
    setTitle('')
    setAuthor('')
    setSource('')
    setTotalPages('')
    setVisibility('private')
    setCategory('self_development')
    onCreated()
    setLoading(false)
  }

  return (
    <div className="space-y-4 bg-transparent transition-colors duration-300">
      <div className="grid gap-4">
        {/* Main Title Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Book Information
          </label>
          <Input
            placeholder="Book or article title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="rounded-xl bg-muted/50 border-none focus-visible:ring-violet-500 h-12"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Author (optional)"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="rounded-xl bg-muted/50 border-none focus-visible:ring-violet-500 h-12"
          />
          <Input
            type="number"
            min="1"
            placeholder="Total pages"
            value={totalPages}
            onChange={e => setTotalPages(e.target.value)}
            className="rounded-xl bg-muted/50 border-none focus-visible:ring-violet-500 h-12"
          />
        </div>

        <Input
          placeholder="Source (e.g. Kindle, Bible, Library)"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="rounded-xl bg-muted/50 border-none focus-visible:ring-violet-500 h-12"
        />

        {/* Selection Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
              Category
            </label>
            <Select value={category} onValueChange={v => setCategory(v as ReadingCategory)}>
              <SelectTrigger className="rounded-xl bg-muted/50 border-none h-12 focus:ring-violet-500 text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              {/* Added position="popper" and high z-index for the dropdown */}
              <SelectContent 
                position="popper" 
                sideOffset={4} 
                className="rounded-xl border-border z-[10000] bg-popover text-popover-foreground shadow-xl"
              >
                <SelectItem value="faith">Faith</SelectItem>
                <SelectItem value="self_development">Self Development</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="philosophy">Philosophy</SelectItem>
                <SelectItem value="psychology">Psychology</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
              Privacy
            </label>
            <Select value={visibility} onValueChange={v => setVisibility(v as 'private' | 'shared')}>
              <SelectTrigger className="rounded-xl bg-muted/50 border-none h-12 focus:ring-violet-500 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                sideOffset={4} 
                className="rounded-xl border-border z-[10000] bg-popover text-popover-foreground shadow-xl"
              >
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        className="w-full rounded-2xl h-14 bg-violet-600 hover:bg-violet-500 text-white font-bold text-base shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
        disabled={loading || !title.trim() || !totalPages}
        onClick={createReading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <BookPlus className="mr-2 h-5 w-5" />
            Add to Shelf
          </>
        )}
      </Button>
    </div>
  )
}