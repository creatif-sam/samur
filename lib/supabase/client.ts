import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60 // 5 184 000

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        maxAge: SIXTY_DAYS_SECONDS,
      },
    }
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
