'use client';

import { JSX, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';

type ReadingStatus =
  | 'to_read'
  | 'reading'
  | 'done'
  | 'applied';

type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous';

const statusMeta: Record<
  ReadingStatus,
  { label: string; icon: JSX.Element }
> = {
  to_read: {
    label: 'To read',
    icon: <BookOpen className="w-4 h-4" />,
  },
  reading: {
    label: 'Reading',
    icon: <BookMarked className="w-4 h-4" />,
  },
  done: {
    label: 'Done',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  applied: {
    label: 'Applied',
    icon: <Lightbulb className="w-4 h-4" />,
  },
};

const categoryMeta: Record<
  ReadingCategory,
  { label: string; icon: JSX.Element; className: string }
> = {
  faith: {
    label: 'Faith',
    icon: <Cross className="w-3 h-3" />,
    className:
      'bg-violet-100 text-violet-700 border-violet-200',
  },
  self_development: {
    label: 'Self dev',
    icon: <Sparkles className="w-3 h-3" />,
    className:
      'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  skill: {
    label: 'Skill',
    icon: <Hammer className="w-3 h-3" />,
    className:
      'bg-blue-100 text-blue-700 border-blue-200',
  },
  philosophy: {
    label: 'Philosophy',
    icon: <ScrollText className="w-3 h-3" />,
    className:
      'bg-amber-100 text-amber-700 border-amber-200',
  },
  psychology: {
    label: 'Psychology',
    icon: <Brain className="w-3 h-3" />,
    className:
      'bg-teal-100 text-teal-700 border-teal-200',
  },
  leadership: {
    label: 'Leadership',
    icon: <Crown className="w-3 h-3" />,
    className:
      'bg-purple-100 text-purple-700 border-purple-200',
  },
  productivity: {
    label: 'Productivity',
    icon: <Timer className="w-3 h-3" />,
    className:
      'bg-orange-100 text-orange-700 border-orange-200',
  },
  miscellaneous: {
    label: 'Misc',
    icon: <Layers className="w-3 h-3" />,
    className:
      'bg-gray-100 text-gray-700 border-gray-200',
  },
};

interface Props {
  reading: {
    id: string;
    title: string;
    author?: string;
    status: ReadingStatus;
    category: ReadingCategory;
  };
}

export default function ReadingCard({
  reading,
}: Props): JSX.Element {
  const [status, setStatus] =
    useState<ReadingStatus>(reading.status);

  const updateStatus = async (
    value: ReadingStatus
  ): Promise<void> => {
    setStatus(value);
    const supabase = createClient();
    await supabase
      .from('readings')
      .update({ status: value })
      .eq('id', reading.id);
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{reading.title}</h3>
          {reading.author && (
            <p className="text-sm text-muted-foreground">
              {reading.author}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 items-end">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${categoryMeta[reading.category].className}`}
          >
            {categoryMeta[reading.category].icon}
            {categoryMeta[reading.category].label}
          </Badge>

          <Badge
            variant="secondary"
            className="flex items-center gap-1"
          >
            {statusMeta[status].icon}
            {statusMeta[status].label}
          </Badge>
        </div>
      </div>

      <Select
        value={status}
        onValueChange={(v) =>
          updateStatus(v as ReadingStatus)
        }
      >
        <SelectTrigger className="w-full">
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
  );
}
