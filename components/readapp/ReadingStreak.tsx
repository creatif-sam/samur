'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateReadingStreak } from '@/lib/readapp/streak';

export default function ReadingStreak(): JSX.Element {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    void loadStreak();
  }, []);

  const loadStreak = async (): Promise<void> => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from('reading_days')
      .select('date')
      .eq('user_id', auth.user.id);

    if (error) {
      console.error('Failed to load reading streak', error);
      return;
    }

    const dates = (data ?? []).map((d) => d.date);
    setStreak(calculateReadingStreak(dates));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-muted p-4">
        Loading streak…
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-violet-600 to-black text-white p-4">
      <p className="text-xs uppercase tracking-wide">
        Reading Streak
      </p>
      <div className="text-3xl font-bold mt-1">
        {streak} day{streak === 1 ? '' : 's'}
      </div>
    </div>
  );
}
