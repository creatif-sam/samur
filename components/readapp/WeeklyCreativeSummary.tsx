'use client';

import { JSX, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, Target, Focus } from 'lucide-react';


interface CreativeEntry {
  work_date: string;
  hours_worked: number;
  focused: boolean | null;
  aligned: boolean | null;
}

export default function WeeklyCreativeSummary(): JSX.Element {
  const [entries, setEntries] = useState<CreativeEntry[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const startOfWeek = new Date();
    startOfWeek.setDate(
      startOfWeek.getDate() - startOfWeek.getDay()
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('creative_work')
      .select('work_date, hours_worked, focused, aligned')
      .eq('user_id', auth.user.id)
      .gte('work_date', startOfWeek.toISOString().split('T')[0]);

    setEntries(data ?? []);
  };

  const stats = useMemo(() => {
    const total = entries.reduce(
      (sum, e) => sum + (e.hours_worked || 0),
      0
    );

    const focusedCount = entries.filter(
      (e) => e.focused === true
    ).length;

    const alignedCount = entries.filter(
      (e) => e.aligned === true
    ).length;

    return {
      totalHours: total.toFixed(2),
      avgPerDay: (total / (entries.length || 1)).toFixed(2),
      focusRate: entries.length
        ? Math.round((focusedCount / entries.length) * 100)
        : 0,
      alignmentRate: entries.length
        ? Math.round((alignedCount / entries.length) * 100)
        : 0,
    };
  }, [entries]);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        Weekly Creative Summary
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label="Total hours"
          value={stats.totalHours}
        />

        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label="Avg per day"
          value={stats.avgPerDay}
        />

        <SummaryCard
          icon={<Focus className="w-4 h-4" />}
          label="Focused"
          value={`${stats.focusRate}%`}
        />

        <SummaryCard
          icon={<Target className="w-4 h-4" />}
          label="Aligned"
          value={`${stats.alignmentRate}%`}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">
        {value}
      </div>
    </div>
  );
}
