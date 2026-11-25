'use client';

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuizTake from './QuizTake';
import { Button } from '@/components/ui/button';

interface Quiz {
  id: string;
  title: string;
  description?: string;
}

export default function QuizList() {
  const { tr } = useTranslation()
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('quizzes')
      .select('*');

    setQuizzes(data ?? []);
  };

  if (active) {
    return (
      <QuizTake
        quiz={active}
        onExit={() => setActive(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-3">
      {quizzes.map((q) => (
        <div
          key={q.id}
          className="border rounded-xl p-4"
        >
          <h3 className="font-semibold">
            {tr(q.title)}
          </h3>

          {q.description && (
            <p className="text-sm text-muted-foreground">
              {tr(q.description)}
            </p>
          )}

          <Button
            size="sm"
            className="mt-2"
            onClick={() => setActive(q)}
          >
            {tr('Take Quiz')}
          </Button>
        </div>
      ))}
    </div>
  );
}
