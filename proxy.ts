import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

/**
 * The proxy function handles session refreshing. 
 * We must ensure api, manifest.json, and sw.js are excluded via the matcher
 * so they are served as static files/routes, not intercepted.
 */
export async function proxy(request: NextRequest) {
  // Logic: The matcher below prevents this function from running 
  // on our API routes, PWA files, and static assets.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api: EXCLUDED to allow push notifications to work directly
     * - card: public business cards
     * - manifest.json: PWA manifest
     * - sw.js: Service Worker
     * - _next/static & _next/image: Next.js internals
     * - favicon.ico & images: static assets
     */
    "/((?!api|card|manifest\\.json|sw\\.js|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};