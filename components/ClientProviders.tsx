'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TranslationProvider } from '@/contexts/TranslationContext';

const HEARTBEAT_MS = 2 * 60 * 1000

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Keep last_seen fresh while the app is open and visible, so "online" stays accurate
  useEffect(() => {
    let lastSent = 0

    const updateLastSeen = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      if (Date.now() - lastSent < HEARTBEAT_MS / 2) return
      lastSent = Date.now()
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', session.user.id);
    };

    updateLastSeen()
    const timer = setInterval(updateLastSeen, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', updateLastSeen)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', updateLastSeen)
    }
  }, []);

  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  );
}
