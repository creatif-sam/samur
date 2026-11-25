'use client';

import { useTranslation } from '@/contexts/TranslationContext'
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuizResult from './QuizResult';
import { Button } from '@/components/ui/button';
import { JSX } from 'react';

interface Question {
  id: string;
  scripture: string;
  question: string;
  correct_answer: boolean;
}

export default function QuizTake({
  quiz,
  onExit,
}: {
  quiz: { id: string; title: string };
  onExit: () => void;
}): JSX.Element {
  const { tr } = useTranslation()
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState(0);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('position');

    setQuestions(data ?? []);
  };

  const submit = async (): Promise<void> => {
    let wrongCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] !== q.correct_answer) {
        wrongCount += 1;
      }
    });
    setWrong(wrongCount);
    setDone(true);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      user_id: auth.user.id,
      wrong_count: wrongCount,
      verdict: wrongCount >= 2 ? 'culprit' : 'passed',
    });
  };

  if (done) {
    return <QuizResult wrong={wrong} onExit={onExit} />;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">{tr(quiz.title)}</h2>

      {questions.map((q) => (
        <div key={q.id} className="border rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {q.scripture}
          </p>
          <p>{tr(q.question)}</p>

          <div className="flex gap-2">
            <Button
              variant={answers[q.id] === true ? 'default' : 'outline'}
              onClick={() =>
                setAnswers((a) => ({ ...a, [q.id]: true }))
              }
            >
              {tr('Yes')}
            </Button>
            <Button
              variant={answers[q.id] === false ? 'default' : 'outline'}
              onClick={() =>
                setAnswers((a) => ({ ...a, [q.id]: false }))
              }
            >
              {tr('No')}
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={submit}>{tr('Submit')}</Button>
    </div>
  );
}
