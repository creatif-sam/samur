'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  buildHeatmap,
  HeatmapDay,
} from '@/lib/readapp/heatmap';

export default function ReadingHeatmap() {
  const [days, setDays] = useState<HeatmapDay[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from('reading_sessions')
      .select('date, readings!inner(user_id)')
      .eq('readings.user_id', auth.user.id);

    const counts: Record<string, number> = {};

    (data ?? []).forEach((d) => {
      counts[d.date] = (counts[d.date] ?? 0) + 1;
    });

    const daysArray = Object.entries(counts).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    setDays(buildHeatmap(daysArray, 4));
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-medium">
        Reading Activity
      </h3>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} session${
              d.count === 1 ? '' : 's'
            }`}
            className={`h-4 w-full rounded-sm ${
              d.count === 0
                ? 'bg-muted'
                : d.count === 1
                ? 'bg-violet-200'
                : d.count === 2
                ? 'bg-violet-400'
                : 'bg-violet-600'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Less</span>
        <span>More</span>
      </div>
    </div>
  );
}
