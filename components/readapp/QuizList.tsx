'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuizCard from './QuizCard';

interface Quiz {
  id: string;
  question: string;
  answer: string;
}

export default function QuizList(): JSX.Element {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('reading_quizzes')
      .select('*');

    setQuizzes(data ?? []);
  };

  return (
    <div className="space-y-4 p-4">
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
