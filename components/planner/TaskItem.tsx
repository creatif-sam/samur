import React from 'react';

import { PlannerTask } from '@/lib/types';
import { Input } from '@/components/ui/input';

interface Props {
  task: PlannerTask;
  allTasks: PlannerTask[];
  setTasks: (tasks: PlannerTask[]) => Promise<void>;
}

export default function TaskItem({
  task,
  allTasks,
  setTasks,
}: Props): React.JSX.Element {
  const updateTitle = async (title: string): Promise<void> => {
    await setTasks(
      allTasks.map((t) =>
        t.id === task.id ? { ...t, title } : t
      )
    );
  };

  return (
    <div className="bg-violet-50 rounded-md p-2 w-full max-w-full">
      <Input
        value={task.title}
        placeholder="What will I do?"
        onChange={(e) => updateTitle(e.target.value)}
        className="w-full text-sm"
      />
    </div>
  );
}
