'use client';

import { JSX, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ReadingCard from './ReadingCard';
import ReadingStreak from './ReadingStreak';
import AddReading from './AddReading';
import WeeklyReadingGoal from './WeeklyReadingGoal';

import {
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Plus,
  Search,
  Cross,
  Sparkles,
  Hammer,
  ScrollText,
  Brain,
  Crown,
  Timer,
  Layers,
} from 'lucide-react';
import ReadingHeatmap from './ReadingHeatMap';

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

interface Reading {
  id: string;
  title: string;
  author?: string;
  status: ReadingStatus;
  category: ReadingCategory;
}

const categoryMeta: Record<
  ReadingCategory,
  { label: string; icon: JSX.Element; className: string }
> = {
  faith: {
    label: 'Faith',
    icon: <Cross className="w-4 h-4" />,
    className: 'bg-violet-100 text-violet-700',
  },
  self_development: {
    label: 'Self dev',
    icon: <Sparkles className="w-4 h-4" />,
    className: 'bg-emerald-100 text-emerald-700',
  },
  skill: {
    label: 'Skill',
    icon: <Hammer className="w-4 h-4" />,
    className: 'bg-blue-100 text-blue-700',
  },
  philosophy: {
    label: 'Philosophy',
    icon: <ScrollText className="w-4 h-4" />,
    className: 'bg-amber-100 text-amber-700',
  },
  psychology: {
    label: 'Psychology',
    icon: <Brain className="w-4 h-4" />,
    className: 'bg-teal-100 text-teal-700',
  },
  leadership: {
    label: 'Leadership',
    icon: <Crown className="w-4 h-4" />,
    className: 'bg-purple-100 text-purple-700',
  },
  productivity: {
    label: 'Productivity',
    icon: <Timer className="w-4 h-4" />,
    className: 'bg-orange-100 text-orange-700',
  },
  miscellaneous: {
    label: 'Misc',
    icon: <Layers className="w-4 h-4" />,
    className: 'bg-gray-100 text-gray-700',
  },
};

export default function ReadingList(): JSX.Element {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    void loadReadings();
  }, []);

  const loadReadings = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('readings')
      .select('id, title, author, status, category')
      .order('created_at', { ascending: false });

    setReadings(data ?? []);
    setLoading(false);
  };

  const statusStats = useMemo(() => {
    return {
      toRead: readings.filter((r) => r.status === 'to_read').length,
      reading: readings.filter((r) => r.status === 'reading').length,
      done: readings.filter((r) => r.status === 'done').length,
      applied: readings.filter((r) => r.status === 'applied').length,
    };
  }, [readings]);

  const categoryStats = useMemo(() => {
    const map: Record<ReadingCategory, number> = {
      faith: 0,
      self_development: 0,
      skill: 0,
      philosophy: 0,
      psychology: 0,
      leadership: 0,
      productivity: 0,
      miscellaneous: 0,
    };

    readings.forEach((r) => {
      map[r.category] += 1;
    });

    return map;
  }, [readings]);

  const filteredReadings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return readings;

    return readings.filter((r) =>
      [r.title, r.author]
        .filter(Boolean)
        .some((field) =>
          field!.toLowerCase().includes(q)
        )
    );
  }, [query, readings]);

  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-violet-600" />
        <h1 className="text-lg font-semibold">ReadApp</h1>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Stat icon={<BookOpen className="w-4 h-4" />} label="To read" value={statusStats.toRead} />
        <Stat icon={<BookMarked className="w-4 h-4" />} label="Reading" value={statusStats.reading} />
        <Stat icon={<CheckCircle className="w-4 h-4" />} label="Done" value={statusStats.done} />
        <Stat icon={<Lightbulb className="w-4 h-4" />} label="Applied" value={statusStats.applied} />
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(categoryMeta) as ReadingCategory[]).map((key) => (
          <div
            key={key}
            className={`rounded-xl border p-3 flex items-center justify-between ${categoryMeta[key].className}`}
          >
            <div className="flex items-center gap-2">
              {categoryMeta[key].icon}
              <span className="text-sm font-medium">
                {categoryMeta[key].label}
              </span>
            </div>
            <span className="font-semibold">
              {categoryStats[key]}
            </span>
          </div>
        ))}
      </div>
<ReadingHeatmap />
      <WeeklyReadingGoal />
      <ReadingStreak />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search readings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Add Reading */}
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Add new reading
        </span>
      </div>
      <AddReading onCreated={loadReadings} />

      {/* Reading List */}
      <div className="space-y-3">
        {filteredReadings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">
              {query ? 'No matching readings' : 'No readings yet'}
            </p>
          </div>
        ) : (
          filteredReadings.map((reading) => (
            <ReadingCard key={reading.id} reading={reading} />
          ))
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="rounded-xl border p-3 flex flex-col items-center justify-center">
      <div className="text-violet-600">{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
