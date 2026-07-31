import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that anyone can access
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// Auth routes that logged-in users shouldn't see
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

const VALIDATION_TTL_MS = 60_000; // 60 seconds

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname, search } = request.nextUrl;

  // Check if current path matches any public or auth route
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Protected routes are EVERYTHING that is not explicitly public
  const isProtectedRoute = !isPublicRoute;

  // 1. UNAUTHENTICATED: Redirect away from protected routes
  if (!token && isProtectedRoute) {
    const targetUrl = `${pathname}${search}`;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', targetUrl);

    return NextResponse.redirect(loginUrl);
  }

  // 2. AUTHENTICATED: Re-validate token on protected routes if TTL expired
  if (token && isProtectedRoute) {
    const lastValidated = request.cookies.get('session_validated_at')?.value;
    const now = Date.now();

    if (!lastValidated || now - Number(lastValidated) > VALIDATION_TTL_MS) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

      if (apiBaseUrl) {
        try {
          const res = await fetch(`${apiBaseUrl}/me`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          // Session invalid/expired -> Clear tokens and redirect
          if (!res.ok) {
            const loginUrl = new URL('/login', request.url);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('session_token');
            response.cookies.delete('session_validated_at');
            return response;
          }
        } catch {
          // Fail-open on network issues so client-side error states can handle it
        }
      }

      const response = NextResponse.next();
      response.cookies.set('session_validated_at', String(now), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
  }

  // 3. AUTHENTICATED: Prevent access to auth routes (e.g. /login)
  if (token && isAuthRoute) {
    const fallbackRedirect = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const redirectUrl = fallbackRedirect.startsWith('/') ? fallbackRedirect : '/dashboard';

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
