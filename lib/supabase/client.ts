import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cacheUser, cachedUser, isOffline, OFFLINE_WRITE_MESSAGE } from '@/lib/offline';

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60 // 5 184 000

// Writes attempted without a connection fail fast with a message people can act on
// (reads go through so the service worker can answer them from its cache)
const offlineAwareFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  if (isOffline() && method !== 'GET' && method !== 'HEAD') {
    return Promise.resolve(
      new Response(JSON.stringify({ message: OFFLINE_WRITE_MESSAGE, code: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }
  return fetch(input, init)
}

const patched = new WeakSet<object>()

// Offline, the auth server can't confirm who's signed in; fall back to the user
// last confirmed on this device so pages can still show their saved data
function withOfflineUser(client: SupabaseClient) {
  if (patched.has(client.auth)) return client
  patched.add(client.auth)
  const getUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    const result = await getUser(jwt)
    if (result.data.user) {
      cacheUser(result.data.user)
      return result
    }
    const fallback = isOffline() || result.error?.name === 'AuthRetryableFetchError' ? cachedUser() : null
    return fallback ? { data: { user: fallback }, error: null } : result
  }
  return client
}

export function createClient() {
  return withOfflineUser(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookieOptions: {
          maxAge: SIXTY_DAYS_SECONDS,
        },
        global: { fetch: offlineAwareFetch },
      }
    )
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
