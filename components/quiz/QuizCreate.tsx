'use client';

import { useTranslation } from '@/contexts/TranslationContext'
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { JSX } from 'react';

interface QuestionDraft {
  scripture: string;
  question: string;
  correct_answer: boolean;
}

export default function QuizCreate(): JSX.Element {
  const { tr } = useTranslation()
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const addQuestion = (): void => {
    if (questions.length >= 12) return;
    setQuestions([
      ...questions,
      { scripture: '', question: '', correct_answer: false },
    ]);
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionDraft,
    value: string | boolean
  ): void => {
    const copy = [...questions];
    (copy[index] as any)[field] = value;
    setQuestions(copy);
  };

  const createQuiz = async (): Promise<void> => {
    if (questions.length < 3) {
      alert(tr('A quiz must have at least 3 questions'));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: quiz } = await supabase
      .from('quizzes')
      .insert({
        creator_id: auth.user.id,
        title,
        description,
        min_questions: 3,
        max_questions: 12,
      })
      .select()
      .single();

    if (!quiz) return;

    const payload = questions.map((q, i) => ({
      quiz_id: quiz.id,
      scripture: q.scripture,
      question: q.question,
      correct_answer: q.correct_answer,
      position: i + 1,
    }));

    await supabase.from('quiz_questions').insert(payload);

    setTitle('');
    setDescription('');
    setQuestions([]);
    setLoading(false);
    alert(tr('Quiz created successfully'));
  };

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder={tr('Quiz title')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Textarea
        placeholder={tr('Description or scripture foundation')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="border rounded-xl p-3 space-y-2"
          >
            <Input
              placeholder={tr('Scripture reference')}
              value={q.scripture}
              onChange={(e) =>
                updateQuestion(i, 'scripture', e.target.value)
              }
            />

            <Textarea
              placeholder={tr('Reflective question')}
              value={q.question}
              onChange={(e) =>
                updateQuestion(i, 'question', e.target.value)
              }
            />

            <div className="flex gap-2 text-sm">
              <Button
                variant={
                  q.correct_answer === true
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  updateQuestion(i, 'correct_answer', true)
                }
              >
                {tr('Yes is correct')}
              </Button>

              <Button
                variant={
                  q.correct_answer === false
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  updateQuestion(i, 'correct_answer', false)
                }
              >
                {tr('No is correct')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={questions.length >= 12}
          onClick={addQuestion}
        >
          {tr('Add Question')}
        </Button>

        <Button
          disabled={loading || !title.trim()}
          onClick={createQuiz}
        >
          {tr('Create Quiz')}
        </Button>
      </div>
    </div>
  );
}
