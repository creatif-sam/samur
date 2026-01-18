'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuizTake from './QuizTake';
import { Button } from '@/components/ui/button';
import { JSX } from 'react';

interface Quiz {
  id: string;
  title: string;
  description?: string;
}

export default function QuizList(): JSX.Element {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase.from('quizzes').select('*');
    setQuizzes(data ?? []);
  };

  if (active) {
    return <QuizTake quiz={active} onExit={() => setActive(null)} />;
  }

  return (
    <div className="p-4 space-y-3">
      {quizzes.map((q) => (
        <div key={q.id} className="border rounded-xl p-4">
          <h3 className="font-semibold">{q.title}</h3>
          {q.description && (
            <p className="text-sm text-muted-foreground">
              {q.description}
            </p>
          )}
          <Button size="sm" className="mt-2" onClick={() => setActive(q)}>
            Take Quiz
          </Button>
        </div>
      ))}
    </div>
  );
}
