'use client';

import { PlannerTask } from '@/lib/types';
import TaskItem from './TaskItem';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import React from 'react';

interface Props {
  hour: string;
  tasks: PlannerTask[];
  allTasks: PlannerTask[];
  setTasks: (tasks: PlannerTask[]) => Promise<void>;
  children?: React.ReactNode; // Added children prop
}

export default function HourBlock({
  hour,
  tasks,
  allTasks,
  setTasks,
  children, // Destructure children
}: Props): React.JSX.Element {
  const addTask = async (): Promise<void> => {
    const newTask: PlannerTask = {
      id: uuid(),
      title: '',
      startTime: hour,
      endTime: hour,
    };

    await setTasks([...allTasks, newTask]);
  };

  return (
    <div className="border-l-2 border-violet-600 pl-4 py-2 w-full max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">{hour}</span>
        <Button size="icon" variant="ghost" onClick={addTask}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          allTasks={allTasks}
          setTasks={setTasks}
        />
      ))}

      {children && <div className="mt-2">{children}</div>} {/* Render children */}
    </div>
  );
}
