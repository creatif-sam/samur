'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlannerTask } from '@/lib/types';
import Modal from '@/components/ui/modal';

import HourBlock from './HourBlock';
import MorningPrompt from './MorningPrompt';
import EveningReflection from './EveningReflection';
import CalendarOverview from './CalendarOverview';
import { DatePicker } from '@/components/ui/date-picker';
import { FaCalendarAlt } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import React from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
);

export default function DailyPlanner(): React.JSX.Element {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [reflection, setReflection] = useState<string>('');
  const [dayId, setDayId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    showDailyActionWordToast(); // Trigger the daily action word toast when the planner loads
  }, []);

  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [selectedDate]);

  const bootstrap = async (): Promise<void> => {
    setLoading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const weekNumber = getWeekNumber(date);

    // YEAR
    let yearRow;
    {
      const { data } = await supabase
        .from('planner_years')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('year', year)
        .maybeSingle();

      yearRow = data;

      if (!yearRow) {
        const { data: created, error } = await supabase
          .from('planner_years')
          .insert({
            user_id: auth.user.id,
            year,
            visibility: 'private',
          })
          .select()
          .single();

        if (error || !created) return;
        yearRow = created;
      }
    }

    // QUARTER
    let quarterRow;
    {
      const { data } = await supabase
        .from('planner_quarters')
        .select('*')
        .eq('year_id', yearRow.id)
        .eq('quarter', quarter)
        .maybeSingle();

      quarterRow = data;

      if (!quarterRow) {
        const { data: created, error } = await supabase
          .from('planner_quarters')
          .insert({
            year_id: yearRow.id,
            quarter,
            visibility: 'private',
          })
          .select()
          .single();

        if (error || !created) return;
        quarterRow = created;
      }
    }

    // MONTH
    let monthRow;
    {
      const { data } = await supabase
        .from('planner_months')
        .select('*')
        .eq('quarter_id', quarterRow.id)
        .eq('month', month)
        .maybeSingle();

      monthRow = data;

      if (!monthRow) {
        const { data: created, error } = await supabase
          .from('planner_months')
          .insert({
            quarter_id: quarterRow.id,
            month,
            visibility: 'private',
          })
          .select()
          .single();

        if (error || !created) return;
        monthRow = created;
      }
    }

    // WEEK
    let weekRow;
    {
      const { data } = await supabase
        .from('planner_weeks')
        .select('*')
        .eq('month_id', monthRow.id)
        .eq('week_number', weekNumber)
        .maybeSingle();

      weekRow = data;

      if (!weekRow) {
        const { data: created, error } = await supabase
          .from('planner_weeks')
          .insert({
            month_id: monthRow.id,
            week_number: weekNumber,
            visibility: 'private',
          })
          .select()
          .single();

        if (error || !created) return;
        weekRow = created;
      }
    }

    // DAY
    let dayRow;
    {
      const { data } = await supabase
        .from('planner_days')
        .select('*')
        .eq('week_id', weekRow.id)
        .eq('day', selectedDate)
        .maybeSingle();

      dayRow = data;

      if (!dayRow) {
        const { data: created, error } = await supabase
          .from('planner_days')
          .insert({
            week_id: weekRow.id,
            day: selectedDate,
            tasks: [],
            reflection: '',
            visibility: 'private',
          })
          .select()
          .single();

        if (error || !created) return;
        dayRow = created;
      }
    }

    setDayId(dayRow.id);
    setTasks((dayRow.tasks as PlannerTask[]) ?? []);
    setReflection(dayRow.reflection ?? '');
    setLoading(false);
  };

  const saveDay = async (
    updatedTasks: PlannerTask[],
    updatedReflection: string
  ): Promise<void> => {
    if (!dayId) return;
    const supabase = createClient();
    await supabase
      .from('planner_days')
      .update({
        tasks: updatedTasks,
        reflection: updatedReflection,
      })
      .eq('id', dayId);
  };

  const updateTasks = async (updated: PlannerTask[]): Promise<void> => {
    setTasks(updated);
    await saveDay(updated, reflection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDay(tasks, reflection);
  };

  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');

  const handleTaskStartTimeChange = (value: string) => {
    setTaskStartTime(value);
    setModalContent(`Task start time set to ${value}`);
    setIsModalOpen(true);
  };

  const handleTaskEndTimeChange = (value: string) => {
    setTaskEndTime(value);
    setModalContent(`Task end time set to ${value}`);
    setIsModalOpen(true);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleTaskIconClick = () => {
    setIsTaskModalOpen(true);
  };

  const handleRepeatTaskChange = (checked: boolean): void => {
    setIsRecurring(checked);
    if (!checked) {
      setRepeatUntil(null); // Reset repeatUntil if recurring is disabled
    }
  };

  if (loading) {
    return <div className="p-4">Loading daily planner...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">
          {new Date(selectedDate).toDateString()}
        </h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCalendar((v) => !v)}
        >
          Calendar
        </Button>
      </div>

      {showCalendar && (
        <CalendarOverview
          selectedDate={selectedDate}
          onSelect={(date) => {
            setShowCalendar(false);
            setSelectedDate(date);
          }}
        />
      )}

      <form onSubmit={handleSubmit}>
        <MorningPrompt />

        <div className="space-y-2">
          {HOURS.map((hour) => (
            <HourBlock
              key={hour}
              hour={hour}
              tasks={tasks.filter((t) => t.startTime === hour)}
              allTasks={tasks}
              setTasks={updateTasks}
            >
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={handleTaskIconClick}
              >
                <FaCalendarAlt />
              </button>
            </HourBlock>
          ))}
        </div>

        <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)}>
          <p>Set the end date for the task.</p>
          <DatePicker
            selected={repeatUntil}
            onChange={(date) => setRepeatUntil(date)}
            placeholderText="Select end date"
          />
        </Modal>

        <EveningReflection
          value={reflection}
          onChange={async (val) => {
            setReflection(val);
            await saveDay(tasks, val);
          }}
        />

        <label>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => handleRepeatTaskChange(e.target.checked)}
          />
          Repeat Task
        </label>
        {isRecurring && (
          <DatePicker
            selected={repeatUntil}
            onChange={(date) => setRepeatUntil(date)}
            placeholderText="Select end date"
          />
        )}

        <Modal isOpen={isRepeatModalOpen} onClose={() => setIsRepeatModalOpen(false)}>
          <p>Repeat task functionality enabled. Please select an end date.</p>
        </Modal>

        <label>
          Start Time:
          <input
            type="time"
            value={taskStartTime}
            onChange={(e) => handleTaskStartTimeChange(e.target.value)}
            className="border rounded-md p-2 w-full"
          />
        </label>
        <label>
          End Time:
          <input
            type="time"
            value={taskEndTime}
            onChange={(e) => handleTaskEndTimeChange(e.target.value)}
            className="border rounded-md p-2 w-full"
          />
        </label>
        <button type="submit">Save Task</button>
      </form>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p>{modalContent}</p>
      </Modal>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff =
    (date.getTime() - start.getTime()) / 86400000 +
    start.getDay();
  return Math.ceil(diff / 7);
}

function showDailyActionWordToast(): void {
  console.log('Welcome to the daily planner!');
}
