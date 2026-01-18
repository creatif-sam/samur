'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface PlannerTask {
  id: string;
  text: string;
  start: string;
  end: string;
  completed: boolean;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM → 11 PM

export default function DailyPlanner() {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [morning, setMorning] = useState('');
  const [reflection, setReflection] = useState('');

  const [taskModalHour, setTaskModalHour] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateKey = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    void loadDay();
  }, [dateKey]);

  const loadDay = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from('planner_days')
      .select('*')
      .eq('day', dateKey)
      .maybeSingle();

    if (!data) {
      setTasks([]);
      setMorning('');
      setReflection('');
      return;
    }

    const fetchedTasks = Array.isArray(data.tasks) ? data.tasks : [];
    setTasks(fetchedTasks);
    setMorning(data.morning ?? '');
    setReflection(data.reflection ?? '');
  };

  const saveDay = async (
    updatedTasks = tasks,
    updatedMorning = morning,
    updatedReflection = reflection
  ) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('planner_days').upsert({
      day: dateKey,
      week_id: crypto.randomUUID(),
      visibility: 'private',
      tasks: updatedTasks,
      reflection: updatedReflection,
      morning: updatedMorning,
    });
  };

  const navigate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const tasksForHour = (h: number) =>
    tasks.filter(
      (t) =>
        parseInt(t.start.split(':')[0]) <= h &&
        parseInt(t.end.split(':')[0]) > h
    );

  return (
    <div className="p-4 space-y-4">
      {/* HERO */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>

        <div className="text-center">
          <div className="font-semibold">
            {selectedDate.toDateString()}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setCalendarOpen(true)}>
            <Calendar />
          </button>
          <button onClick={() => navigate(1)}>
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* MORNING */}
      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">
          Morning Intention
        </div>
        <textarea
          value={morning}
          onChange={(e) => {
            setMorning(e.target.value);
            saveDay(tasks, e.target.value, reflection);
          }}
          rows={2}
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="What must be done today"
        />
      </div>

      {/* HOURS */}
      <div className="space-y-2">
        {HOURS.map((h) => (
          <div
            key={h}
            className="border rounded-lg p-2 space-y-2"
          >
            <div className="flex justify-between items-center text-sm">
              <span>
                {h === 12
                  ? '12 PM'
                  : h > 12
                  ? `${h - 12} PM`
                  : `${h} AM`}
              </span>
              <button onClick={() => setTaskModalHour(h)}>
                <Plus size={16} />
              </button>
            </div>

            {tasksForHour(h).map((t) => (
              <div
                key={t.id}
                onClick={() => setEditingTask(t)}
                className={`rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  t.completed
                    ? 'bg-muted line-through'
                    : 'bg-violet-600 text-white'
                }`}
              >
                {t.text}
                <div className="text-xs opacity-80">
                  {t.start} – {t.end}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* EVENING */}
      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-1">
          Evening Reflection
        </div>
        <textarea
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value);
            saveDay(tasks, morning, e.target.value);
          }}
          rows={3}
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="What went well today"
        />
      </div>

      {/* ADD TASK */}
      {taskModalHour !== null && (
        <TaskModal
          hour={taskModalHour}
          onClose={() => setTaskModalHour(null)}
          onSave={(t) => {
            const updated = [...tasks, t];
            setTasks(updated);
            saveDay(updated);
            setTaskModalHour(null);
          }}
        />
      )}

      {/* EDIT TASK */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onDelete={() => {
            const updated = tasks.filter(
              (t) => t.id !== editingTask.id
            );
            setTasks(updated);
            saveDay(updated);
            setEditingTask(null);
          }}
          onSave={(t) => {
            const updated = tasks.map((x) =>
              x.id === t.id ? t : x
            );
            setTasks(updated);
            saveDay(updated);
            setEditingTask(null);
          }}
        />
      )}

      {/* CALENDAR */}
      <MonthCalendarModal
        open={calendarOpen}
        selectedDate={selectedDate}
        onClose={() => setCalendarOpen(false)}
        onSelect={(d) => {
          setSelectedDate(d);
          setCalendarOpen(false);
        }}
      />
    </div>
  );
}

/* ---------- MODALS ---------- */

function TaskModal({
  hour,
  onClose,
  onSave,
}: {
  hour: number;
  onClose: () => void;
  onSave: (t: PlannerTask) => void;
}) {
  const [text, setText] = useState('');
  const [end, setEnd] = useState(hour + 1);

  return (
    <Modal onClose={onClose}>
      <h3 className="font-semibold mb-2">New Task</h3>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Task"
        className="w-full border rounded-lg p-2 text-sm mb-2"
      />

      <select
        value={end}
        onChange={(e) => setEnd(Number(e.target.value))}
        className="w-full border rounded-lg p-2 text-sm"
      >
        {Array.from({ length: 6 }, (_, i) => hour + i + 1).map(
          (h) => (
            <option key={h} value={h}>
              Ends at {h}:00
            </option>
          )
        )}
      </select>

      <button
        onClick={() =>
          onSave({
            id: crypto.randomUUID(),
            text,
            start: `${hour}:00`,
            end: `${end}:00`,
            completed: false,
          })
        }
        className="mt-3 w-full bg-violet-600 text-white rounded-lg py-2"
      >
        Save
      </button>
    </Modal>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: PlannerTask;
  onClose: () => void;
  onSave: (t: PlannerTask) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(task.text);
  const [completed, setCompleted] = useState(task.completed);

  return (
    <Modal onClose={onClose}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border rounded-lg p-2 text-sm mb-2"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
        />
        Completed
      </label>

      <div className="flex justify-between mt-3">
        <button onClick={onDelete} className="text-red-600">
          Delete
        </button>
        <button
          onClick={() =>
            onSave({ ...task, text, completed })
          }
          className="bg-violet-600 text-white px-4 py-1 rounded-lg"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-background rounded-xl p-4 w-[90%] max-w-sm">
        {children}
        <button
          onClick={onClose}
          className="mt-2 text-sm text-muted-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ---------- CALENDAR ---------- */

function MonthCalendarModal({
  open,
  selectedDate,
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  if (!open) return null;

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  return (
    <Modal onClose={onClose}>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(year, month, i + 1);
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className="rounded-lg border p-2 text-sm"
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
