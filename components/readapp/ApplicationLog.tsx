'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  readingId: string;
}

export default function ApplicationLog({
  readingId,
}: Props): JSX.Element {
  const [applications, setApplications] = useState<string[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('reading_applications')
      .select('application')
      .eq('reading_id', readingId)
      .order('created_at', { ascending: false });

    setApplications(data?.map((d) => d.application) ?? []);
  };

  const save = async (): Promise<void> => {
    if (!text.trim()) return;
    const supabase = createClient();

    await supabase.from('reading_applications').insert({
      reading_id: readingId,
      application: text,
      date: new Date().toISOString().split('T')[0],
    });

    setText('');
    await load();
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="How did you apply what you read?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button size="sm" onClick={save}>
        Save Application
      </Button>

      {applications.map((a, i) => (
        <p key={i} className="text-sm text-muted-foreground">
          {a}
        </p>
      ))}
    </div>
  );
}
