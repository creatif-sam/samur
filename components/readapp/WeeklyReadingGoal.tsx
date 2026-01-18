'use client';

import { JSX,useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWeekRange } from '@/lib/readapp/weeklyGoal';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';

const WEEKLY_GOAL = 5;

export default function WeeklyReadingGoal(): JSX.Element {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { start, end } = getWeekRange(new Date());

    const { data } = await supabase
      .from('reading_sessions')
      .select('date, readings!inner(user_id)')
      .eq('readings.user_id', auth.user.id)
      .gte('date', start)
      .lte('date', end);

    setCount(data?.length ?? 0);
  };

  const progress = Math.min(
    Math.round((count / WEEKLY_GOAL) * 100),
    100
  );

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-medium">
          Weekly Reading Goal
        </span>
      </div>

      <Progress value={progress} />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {count} of {WEEKLY_GOAL} sessions
        </span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}
