import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 *
 * Requests from the mobile app (mastery_mobile) have no cookies; they send the
 * user's access token as `Authorization: Bearer <token>` instead. The client
 * then queries as that user (RLS applies) and `auth.getUser()` checks the token
 * with Supabase Auth, so API routes work the same for both apps.
 */
export async function createClient() {
  const token = await bearerToken()
  if (token) return createBearerClient(token)

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        maxAge: SIXTY_DAYS_SECONDS,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

async function bearerToken(): Promise<string | null> {
  try {
    const value = (await headers()).get("authorization")
    const token = value?.match(/^Bearer\s+(\S+)$/i)?.[1]
    // Only a JWT is a user session; cron jobs send `Bearer $CRON_SECRET`, which must
    // keep using the plain (anonymous) client as before
    if (!token || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return null
    return token
  } catch {
    // headers() is unavailable outside a request (build time)
    return null
  }
}

function createBearerClient(token: string) {
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
  // With no stored session, getUser() would report no user; check the token itself
  const getUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = (jwt?: string) => getUser(jwt ?? token)
  return client
}
