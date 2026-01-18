'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label:
    i === 0
      ? '12 AM'
      : i < 12
      ? `${i} AM`
      : i === 12
      ? '12 PM'
      : `${i - 12} PM`,
}));

export default function DailyPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reflection, setReflection] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const isToday =
    selectedDate.toDateString() ===
    new Date().toDateString();

  const currentHour = now.getHours();

  const moveDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const dayProgress =
    ((now.getHours() * 60 + now.getMinutes()) /
      (24 * 60)) *
    100;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Daily Planner
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toDateString()}
            </p>
          </div>

          <Button
            size="icon"
            variant="ghost"
            aria-label="Open calendar"
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => moveDay(-1)}
          >
            <ChevronLeft />
          </Button>

          {isToday && (
            <span className="text-xs font-medium text-violet-600">
              Today
            </span>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => moveDay(1)}
          >
            <ChevronRight />
          </Button>
        </div>

        {/* Day Progress */}
        {isToday && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Day progress
              </span>
              <span className="font-medium">
                {now.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-violet-600 transition-all"
                style={{ width: `${dayProgress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Morning Intention */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-violet-600" />
          <h2 className="font-medium">
            Morning intention
          </h2>
        </div>
        <textarea
          rows={3}
          placeholder="What must be done today?"
          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </Card>

      {/* Timeline */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            Timeline
          </h2>
          <Button size="sm" variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {HOURS.map(({ hour, label }) => {
            const active =
              isToday && hour === currentHour;

            return (
              <div
                key={hour}
                className={`flex gap-4 p-2 rounded-lg ${
                  active
                    ? 'bg-violet-50 ring-1 ring-violet-200'
                    : 'hover:bg-muted'
                }`}
              >
                <div
                  className={`w-16 text-right text-sm ${
                    active
                      ? 'font-semibold text-violet-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </div>

                <div className="flex-1 border-b border-dashed border-muted pb-2">
                  <span className="text-xs text-muted-foreground">
                    Add task
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Evening Reflection */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-violet-600" />
          <h2 className="font-medium">
            Evening reflection
          </h2>
        </div>
        <textarea
          rows={4}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What did you learn today?"
          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </Card>
    </div>
  );
}
