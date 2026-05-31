'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { JSX } from 'react';

interface Props {
  readingId: string;
}

interface ApplicationEntry {
  id: string;
  application: string;
}

export default function ApplicationLog({
  readingId,
}: Props): JSX.Element {
  const [applications, setApplications] = useState<ApplicationEntry[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [readingId]);

  const load = async (): Promise<void> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reading_applications')
      .select('id, application')
      .eq('reading_id', readingId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load applications');
      return;
    }

    setApplications(data ?? []);
  };

  const save = async (): Promise<void> => {
    if (!text.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('reading_applications').insert({
      reading_id: readingId,
      application: text.trim(),
      date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast.error('Failed to save application');
      setSaving(false);
      return;
    }

    toast.success('Application saved!');
    setText('');
    await load();
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="How did you apply what you read?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
        {saving ? 'Saving…' : 'Save Application'}
      </Button>

      {applications.map((a) => (
        <p key={a.id} className="text-sm text-muted-foreground">
          {a.application}
        </p>
      ))}
    </div>
  );
}
