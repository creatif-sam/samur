'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ReadAppPage() {
  const [readContent, setReadContent] = useState('');
  const [application, setApplication] = useState('');
  const [quizzes, setQuizzes] = useState<string[]>([]);

  const handleAddQuiz = () => {
    const newQuiz = prompt('Enter your quiz question:');
    if (newQuiz) {
      setQuizzes([...quizzes, newQuiz]);
    }
  };

  return (
    <div className="p-6">
      <Tabs>
        <TabsList>
          <TabsTrigger value="readapp">ReadApp</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>
        <TabsContent value="readapp">
          <h1 className="text-2xl font-bold mb-4">What did you read today?</h1>
          <Input
            placeholder="Enter what you read"
            value={readContent}
            onChange={(e) => setReadContent(e.target.value)}
            className="mb-4"
          />
          <h2 className="text-xl font-bold mb-2">How are you applying it?</h2>
          <Textarea
            placeholder="Enter your application"
            value={application}
            onChange={(e) => setApplication(e.target.value)}
            className="mb-4"
          />
          <Button>Save</Button>
        </TabsContent>
        <TabsContent value="quizzes">
          <h1 className="text-2xl font-bold mb-4">Your Quizzes</h1>
          <ul className="list-disc pl-6">
            {quizzes.map((quiz, index) => (
              <li key={index}>{quiz}</li>
            ))}
          </ul>
          <Button onClick={handleAddQuiz} className="mt-4">Add Quiz</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}