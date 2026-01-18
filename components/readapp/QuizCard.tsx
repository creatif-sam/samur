'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { JSX } from 'react';

interface Props {
  quiz: {
    id: string;
    question: string;
    answer: string;
  };
}

export default function QuizCard({ quiz }: Props): JSX.Element {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<boolean | null>(null);

  const submit = async (): Promise<void> => {
    const correct =
      answer.trim().toLowerCase() ===
      quiz.answer.trim().toLowerCase();

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      user_id: auth.user.id,
      user_answer: answer,
      is_correct: correct,
    });

    setResult(correct);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <p>{quiz.question}</p>

      <Input
        placeholder="Your answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <Button size="sm" onClick={submit}>
        Submit
      </Button>

      {result !== null && (
        <p
          className={`text-sm ${
            result ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {result ? 'Correct' : 'Try again'}
        </p>
      )}
    </div>
  );
}
