'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TranslationProvider } from '@/contexts/TranslationContext';


export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    updateLastSeen();
  }, []);

  const updateLastSeen = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }
  };

  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  );
}