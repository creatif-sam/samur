'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReadingList from '@/components/read/ReadingList';
import QuizTabs from '@/components/quiz/QuizTabs';
import Create from '@/components/create/Create';
import { JSX, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, ListChecks, Sparkles } from 'lucide-react';

// Optimized classes for Theme support
const triggerClass =
  'flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition-all duration-300 ' +
  'text-muted-foreground hover:text-foreground ' +
  // Light Mode Active
  'data-[state=active]:text-violet-600 data-[state=active]:bg-violet-100/60 ' +
  'data-[state=active]:shadow-[0_2px_10px_rgba(139,92,246,0.2)] ' +
  // Dark Mode Active
  'dark:data-[state=active]:text-violet-400 dark:data-[state=active]:bg-violet-500/10 ' +
  'dark:data-[state=active]:shadow-none dark:data-[state=active]:ring-1 dark:data-[state=active]:ring-violet-500/30';

const labelClass =
  'text-sm font-black uppercase tracking-widest'; // Matches your PWA aesthetic

const TABS = ['read', 'quiz', 'creative'] as const;
type TabKey = (typeof TABS)[number];

// ?tab=create (also ?tab=creative) opens that tab, e.g. from the work log reminder
function tabFromParam(param: string | null): TabKey {
  if (param === 'create') return 'creative';
  return TABS.includes(param as TabKey) ? (param as TabKey) : 'read';
}

export default function LibraryTabs(): JSX.Element {
  const requested = useSearchParams().get('tab');
  const [tab, setTab] = useState<TabKey>(() => tabFromParam(requested));
  // Follow the link when it changes while the Library is already open
  useEffect(() => { setTab(tabFromParam(requested)); }, [requested]);

  return (
    <Tabs value={tab} onValueChange={v => setTab(v as TabKey)} className="w-full transition-colors duration-300">
      <TabsList className="grid grid-cols-3 gap-1.5 p-1.5 bg-muted/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-border/50">
        <TabsTrigger value="read" className={triggerClass}>
          <BookOpen className="w-4 h-4" />
          <span className={labelClass}>Read</span>
        </TabsTrigger>

        <TabsTrigger value="quiz" className={triggerClass}>
          <ListChecks className="w-4 h-4" />
          <span className={labelClass}>Quiz</span>
        </TabsTrigger>

        <TabsTrigger value="creative" className={triggerClass}>
          <Sparkles className="w-4 h-4" />
          <span className={labelClass}>Create</span>
        </TabsTrigger>
      </TabsList>

      {/* Spacing the content below the tabs */}
      <div className="mt-6">
        <TabsContent value="read" className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
          <ReadingList />
        </TabsContent>

        <TabsContent value="quiz" className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
          <QuizTabs />
        </TabsContent>

        <TabsContent value="creative" className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
          <Create />
        </TabsContent>
      </div>
    </Tabs>
  );
}