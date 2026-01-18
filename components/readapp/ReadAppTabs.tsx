'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReadingList from './ReadingList';
import QuizList from './QuizList';

export default function ReadAppTabs(): JSX.Element {
  return (
    <Tabs defaultValue="read">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="read">ReadApp</TabsTrigger>
        <TabsTrigger value="quiz">Quizzes</TabsTrigger>
      </TabsList>

      <TabsContent value="read">
        <ReadingList />
      </TabsContent>

      <TabsContent value="quiz">
        <QuizList />
      </TabsContent>
    </Tabs>
  );
}
