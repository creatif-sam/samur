'use client';

import { HelpTip } from '@/components/ui/help-tip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import QuizList from './QuizList';
import QuizCreate from './QuizCreate';
import QuizHistory from './QuizHistory';
import { JSX } from 'react';
import { ListChecks, PlusCircle, History } from 'lucide-react';

export default function QuizTabs(): JSX.Element {
  return (
    <Tabs defaultValue="list">
      <div className="flex items-center gap-1">
      <TabsList className="grid flex-1 grid-cols-3">
        <TabsTrigger
          value="list"
          className="group flex items-center justify-center"
        >
          <ListChecks className="w-5 h-5 transition-all duration-200 group-data-[state=active]:scale-125 group-data-[state=active]:text-violet-600" />
        </TabsTrigger>

        <TabsTrigger
          value="create"
          className="group flex items-center justify-center"
        >
          <PlusCircle className="w-5 h-5 transition-all duration-200 group-data-[state=active]:scale-125 group-data-[state=active]:text-violet-600" />
        </TabsTrigger>

        <TabsTrigger
          value="history"
          className="group flex items-center justify-center"
        >
          <History className="w-5 h-5 transition-all duration-200 group-data-[state=active]:scale-125 group-data-[state=active]:text-violet-600" />
        </TabsTrigger>
      </TabsList>
      <HelpTip topic="reading.quiz" />
      </div>

      <TabsContent value="list">
        <QuizList />
      </TabsContent>

      <TabsContent value="create">
        <QuizCreate />
      </TabsContent>

      <TabsContent value="history">
        <QuizHistory />
      </TabsContent>
    </Tabs>
  );
}
