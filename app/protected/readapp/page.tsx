'use client';

import { HelpTip } from '@/components/ui/help-tip'
import LibraryTabs from '@/components/library/LibraryTabs';
import { JSX, Suspense } from 'react';
import { motion } from 'framer-motion';

export default function ReadAppPage(): JSX.Element {
  return (
    <motion.main 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-background text-foreground px-4 pb-24 pt-4 max-w-2xl mx-auto transition-colors duration-300"
    >
      {/* Optional Header for the Page Section */}
      <header className="mb-6 space-y-1 px-1">
        <div className="flex items-center gap-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Library<span className="text-violet-600">.</span>
          </h1>
          <HelpTip topic="reading.page" align="left" />
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
          Read • Quiz • Create
        </p>
      </header>

      <Suspense fallback={null}>
        <LibraryTabs />
      </Suspense>
    </motion.main>
  );
}