'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    const correct =
      answer.trim().toLowerCase() ===
      quiz.answer.trim().toLowerCase();

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    await supabase.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      user_id: auth.user.id,
      user_answer: answer,
      is_correct: correct,
    });

    setResult(correct);
    if (correct) {
      toast.success('Correct!');
    } else {
      toast.error('Not quite — try again');
    }
    setLoading(false);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <p>{quiz.question}</p>

      <Input
        placeholder="Your answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <Button size="sm" onClick={submit} disabled={loading || !answer.trim()}>
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
