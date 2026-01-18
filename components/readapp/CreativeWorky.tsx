'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PenTool, Target, Clock, Focus, Layers } from 'lucide-react';
import { JSX } from 'react';

type WorkType = 'creation' | 'production' | 'reproduction';

export default function CreativeWork(): JSX.Element {
  const supabase = createClient();

  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedOn, setWorkedOn] = useState<string>('');
  const [produced, setProduced] = useState<string>('');
  const [workType, setWorkType] = useState<WorkType>('creation');
  const [aligned, setAligned] = useState<boolean | null>(null);
  const [focused, setFocused] = useState<boolean | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const hoursWorked = useMemo<number | null>(() => {
    if (!date || !startTime || !endTime) return null;

    const isoDate = new Date(date).toISOString().split('T')[0];
    const start = new Date(`${isoDate}T${startTime}`);
    const end = new Date(`${isoDate}T${endTime}`);

    const diff = end.getTime() - start.getTime();
    if (Number.isNaN(diff) || diff <= 0) return null;

    return Number((diff / 1000 / 60 / 60).toFixed(2));
  }, [date, startTime, endTime]);

  const submit = async (): Promise<void> => {
    if (!workedOn.trim() || hoursWorked === null) return;

    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    await supabase.from('creative_work').insert({
      user_id: auth.user.id,
      work_date: date,
      start_time: startTime,
      end_time: endTime,
      hours_worked: hoursWorked,
      work_type: workType,
      worked_on: workedOn.trim(),
      produced: produced.trim() || null,
      aligned,
      focused,
      notes: notes.trim() || null,
    });

    setWorkedOn('');
    setProduced('');
    setStartTime('');
    setEndTime('');
    setWorkType('creation');
    setAligned(null);
    setFocused(null);
    setNotes('');
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PenTool className="w-5 h-5 text-violet-600" />
        <h2 className="text-lg font-semibold">
          Creative Work
        </h2>
      </div>

      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Start
          </label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            End
          </label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {hoursWorked !== null && (
        <div className="text-sm text-muted-foreground">
          Hours worked{' '}
          <span className="font-medium text-foreground">
            {hoursWorked}
          </span>
        </div>
      )}

      <Input
        placeholder="What did you work on"
        value={workedOn}
        onChange={(e) => setWorkedOn(e.target.value)}
      />

      <Input
        placeholder="What did you create or produce"
        value={produced}
        onChange={(e) => setProduced(e.target.value)}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="w-4 h-4 text-violet-600" />
          Type of work
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={workType === 'creation' ? 'default' : 'outline'}
            onClick={() => setWorkType('creation')}
          >
            Creation
          </Button>

          <Button
            type="button"
            variant={workType === 'production' ? 'default' : 'outline'}
            onClick={() => setWorkType('production')}
          >
            Production
          </Button>

          <Button
            type="button"
            variant={workType === 'reproduction' ? 'default' : 'outline'}
            onClick={() => setWorkType('reproduction')}
          >
            Repetition
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="w-4 h-4 text-violet-600" />
          Did it align with your vision
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={aligned === true ? 'default' : 'outline'}
            onClick={() => setAligned(true)}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={aligned === false ? 'default' : 'outline'}
            onClick={() => setAligned(false)}
          >
            No
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Focus className="w-4 h-4 text-violet-600" />
          Were you focused
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={focused === true ? 'default' : 'outline'}
            onClick={() => setFocused(true)}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={focused === false ? 'default' : 'outline'}
            onClick={() => setFocused(false)}
          >
            No
          </Button>
        </div>
      </div>

      <Textarea
        placeholder="Reflection or notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-[80px]"
      />

      <Button
        disabled={loading || !workedOn.trim() || hoursWorked === null}
        onClick={submit}
      >
        Save Work
      </Button>
    </div>
  );
}
