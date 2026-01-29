'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion'; // Install: npm install framer-motion

export default function Home() {
  const router = useRouter();
  const [bibleVerse, setBibleVerse] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBibleVerse = async () => {
      try {
        const response = await fetch('https://beta.ourmanna.com/api/v1/get/?format=text');
        const verse = await response.text();
        setBibleVerse(verse);
      } catch (error) {
        console.error('Failed to fetch Bible verse:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBibleVerse();
  }, []);

  // Redirection logic stays the same
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/protected');
    };
    checkAuth();
  }, [router]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-950 selection:bg-violet-500/30">
      
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 w-full flex justify-between items-center py-6 px-8 backdrop-blur-md border-b border-white/10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter text-white"
        >
          TOGETHER<span className="text-violet-500">.</span>
        </motion.h1>
      
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">SamUr</span>
          </h2>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            Collaborate, plan, and achieve your goals with ease. Join us today and make your dreams a reality.
          </p>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-7 text-lg font-semibold rounded-full shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all"
              onClick={() => router.push('/auth/sign-up')}
            >
              Get Started for Free
            </Button>
          </motion.div>
        </motion.div>

        {/* Bible Verse Card */}
        <AnimatePresence>
          {bibleVerse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-16 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg max-w-md mx-auto"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">Daily Inspiration</p>
              <p className="text-slate-300 italic leading-relaxed">"{bibleVerse}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 py-8 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} SamUr. All rights reserved.
      </footer>
    </div>
  );
}