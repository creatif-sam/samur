'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PlannerDay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<PlannerDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    if (currentDate) {
      fetchDayData();
    }
  }, [currentDate]);

  const fetchDayData = async () => {
    if (!currentDate) return;
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('planner_days')
      .select(`
        *,
        planner_weeks (
          planner_months (
            planner_quarters (
              planner_years (*)
            )
          )
        )
      `)
      .eq('day', dateStr)
      .or(`visibility.eq.shared,visibility.eq.private`)
      .single();

    setDayData(data);
    setLoading(false);
  };

  const updateTasks = async (tasks: Record<string, { text: string; completed: boolean }>) => {
    if (!dayData) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('planner_days')
      .update({ tasks })
      .eq('id', dayData.id);

    if (!error) {
      setDayData({ ...dayData, tasks });
    }
  };

  const updateReflection = async (reflection: string) => {
    if (!dayData) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('planner_days')
      .update({ reflection })
      .eq('id', dayData.id);

    if (!error) {
      setDayData({ ...dayData, reflection });
    }
  };

  if (!currentDate || loading) {
    return <div className="p-4">Loading...</div>;
  }

  const tasks = dayData?.tasks || {};

  return (
    <div className="p-4 space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(subDays(currentDate, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{format(currentDate, 'EEEE')}</h1>
          <p className="text-muted-foreground">{format(currentDate, 'MMMM d, yyyy')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(addDays(currentDate, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(tasks).length ? (
            Object.entries(tasks).map(([taskId, task]: [string, { text: string; completed: boolean }]) => (
              <div key={taskId} className="flex items-center space-x-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => {
                    const newTasks = { ...tasks, [taskId]: { ...task, completed: checked === true } };
                    updateTasks(newTasks);
                  }}
                />
                <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                  {task.text}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No tasks for this day</p>
          )}
        </CardContent>
      </Card>

      {/* Reflection */}
      <Card>
        <CardHeader>
          <CardTitle>Reflection</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How did your day go?"
            value={dayData?.reflection || ''}
            onChange={(e) => updateReflection(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}