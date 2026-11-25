'use client';

import { appLocale } from '@/lib/i18n'
import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JSX } from 'react';

interface Attempt {
  id: string;
  verdict: string;
  wrong_count: number;
  created_at: string;
}

export default function QuizHistory(): JSX.Element {
  const { tr } = useTranslation()
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    setAttempts(data ?? []);
  };

  return (
    <div className="p-4 space-y-3">
      {attempts.map((a) => (
        <div key={a.id} className="border rounded-xl p-3">
          <p className="font-medium">{tr(a.verdict)}</p>
          <p className="text-sm text-muted-foreground">
            {tr('Wrong answers: {wrong_count}', { wrong_count: a.wrong_count })}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(a.created_at).toLocaleDateString(appLocale())}
          </p>
        </div>
      ))}
    </div>
  );
}
