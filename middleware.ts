import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/privacy', '/auth/login', '/auth/sign-up', '/auth/sign-up-success', '/auth/error', '/auth/forgot-password', '/auth/update-password', '/auth/confirm']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith('/auth/'))

  // If trying to access protected route without authentication, redirect to login
  if (!user && request.nextUrl.pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If logged in and trying to access auth pages, redirect to protected area
  if (user && request.nextUrl.pathname.startsWith('/auth/') && !request.nextUrl.pathname.startsWith('/auth/confirm')) {
    return NextResponse.redirect(new URL('/protected', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}
