'use client';

import { JSX,useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous';

interface Props {
  onCreated: () => void;
}

export default function AddReading({ onCreated }: Props): JSX.Element {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [visibility, setVisibility] =
    useState<'private' | 'shared'>('private');
  const [category, setCategory] =
    useState<ReadingCategory>('self_development');
  const [loading, setLoading] = useState(false);

  const createReading = async (): Promise<void> => {
    if (!title.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('readings').insert({
      user_id: auth.user.id,
      title: title.trim(),
      author: author.trim() || null,
      source: source.trim() || null,
      visibility,
      category,
    });

    setTitle('');
    setAuthor('');
    setSource('');
    setVisibility('private');
    setCategory('self_development');
    setLoading(false);
    onCreated();
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <Input
        placeholder="Book or article title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Input
        placeholder="Author (optional)"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />

      <Input
        placeholder="Source (book, article, Bible, etc)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />

      {/* Category */}
      <Select
        value={category}
        onValueChange={(v) =>
          setCategory(v as ReadingCategory)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="faith">Faith</SelectItem>
          <SelectItem value="self_development">
            Self development
          </SelectItem>
          <SelectItem value="skill">Skill</SelectItem>
          <SelectItem value="philosophy">Philosophy</SelectItem>
          <SelectItem value="psychology">Psychology</SelectItem>
          <SelectItem value="leadership">Leadership</SelectItem>
          <SelectItem value="productivity">Productivity</SelectItem>
          <SelectItem value="miscellaneous">
            Miscellaneous
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Visibility */}
      <Select
        value={visibility}
        onValueChange={(v) =>
          setVisibility(v as 'private' | 'shared')
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="private">Private</SelectItem>
          <SelectItem value="shared">Shared</SelectItem>
        </SelectContent>
      </Select>

      <Button
        size="sm"
        disabled={loading || !title.trim()}
        onClick={createReading}
      >
        Add Reading
      </Button>
    </div>
  );
}
