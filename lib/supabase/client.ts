import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export function useUser() {
  const [user, setUser] = useState(null);
  const client = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await client.auth.getUser();
      setUser(user);
    };

    fetchUser();
  }, []);

  return { user };
}
