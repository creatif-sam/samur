'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PenTool, 
  Target, 
  Clock, 
  Focus, 
  Layers, 
  Calendar as CalendarIcon,
  Plus,
  Zap
} from 'lucide-react';
import CreativeWorkyLogs from './CreativeWorkyLogs';
import { cn } from "@/lib/utils";

type WorkType = 'creation' | 'production' | 'reproduction';

export default function CreativeWork() {
  const supabase = createClient();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
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

  const submit = async () => {
    if (!workedOn.trim()) return;
    if (hoursWorked === null) {
      toast.error('End time must be after start time');
      return;
    }
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('creative_work').insert({
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

    if (error) {
      toast.error('Failed to save session');
      setLoading(false);
      return;
    }

    toast.success('Session logged!');
    // Reset fields only on success
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
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8 bg-background">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Work Entry</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">New Session Log</p>
          </div>
        </div>
        {hoursWorked !== null && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-secondary rounded-full border">
             <Clock className="w-3.5 h-3.5 text-primary" />
             <span className="text-sm font-bold">{hoursWorked} Hours</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: INPUT FORM */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none bg-secondary/20 shadow-none">
            <CardContent className="p-6 space-y-6">
              {/* PRIMARY INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10 bg-background border-none shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Start</label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background border-none shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">End</label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background border-none shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Focus Activity</label>
                  <Input 
                    placeholder="Project name or core task" 
                    value={workedOn} 
                    onChange={(e) => setWorkedOn(e.target.value)} 
                    className="bg-background border-none shadow-sm text-base font-medium h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Produced Yield</label>
                  <Input 
                    placeholder="What was the result?" 
                    value={produced} 
                    onChange={(e) => setProduced(e.target.value)} 
                    className="bg-background/50 border-none shadow-sm"
                  />
                </div>
              </div>

              {/* CLASSIFICATION */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['creation', 'production', 'reproduction'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkType(type)}
                      className={cn(
                        "py-2 text-xs font-bold uppercase tracking-tighter border rounded-lg transition-all",
                        workType === type 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                          : "bg-background hover:bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {type === 'reproduction' ? 'Repetition' : type}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Textarea 
            placeholder="Reflection or technical notes..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            className="min-h-[120px] bg-secondary/10 border-none focus-visible:ring-1" 
          />
        </div>

        {/* RIGHT: METRICS & SUBMIT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-6 sticky top-6">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-8">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Session Quality</h4>
                
                {/* ALIGNMENT */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" /> Vision Alignment
                    </span>
                    <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                      <Button
                        type="button"
                        size="sm"
                        variant={aligned === true ? 'default' : 'ghost'}
                        onClick={() => setAligned(true)}
                        className="h-8 text-[10px] uppercase font-bold"
                      >Yes</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={aligned === false ? 'default' : 'ghost'}
                        onClick={() => setAligned(false)}
                        className="h-8 text-[10px] uppercase font-bold"
                      >No</Button>
                    </div>
                  </div>
                </div>

                {/* FOCUS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" /> State of Focus
                    </span>
                    <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                      <Button
                        type="button"
                        size="sm"
                        variant={focused === true ? 'default' : 'ghost'}
                        onClick={() => setFocused(true)}
                        className="h-8 text-[10px] uppercase font-bold"
                      >Yes</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={focused === false ? 'default' : 'ghost'}
                        onClick={() => setFocused(false)}
                        className="h-8 text-[10px] uppercase font-bold"
                      >No</Button>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
                  disabled={loading || !workedOn.trim() || hoursWorked === null}
                  onClick={submit}
                >
                  {loading ? 'Processing...' : 'Commit Session'}
                  <Plus className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl border border-dashed text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
                Records are synced with the production ledger below. Ensure accuracy for long-term tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LEDGER SECTION */}
      <div className="pt-8 border-t">
        <CreativeWorkyLogs />
      </div>
    </div>
  );
}