import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const client = createClient();

  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      const {
        data: { user },
      } = await client.auth.getUser();

      setUser(user);
    };

    fetchUser();
  }, [client]);

  return { user };
}
