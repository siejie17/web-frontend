import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that anyone can access
const PUBLIC_ROUTES = ['/login', '/sign-up', '/register', '/forgot-password', '/certificates/verify'];

// Auth routes that logged-in users shouldn't see
const AUTH_ROUTES = ['/login', '/sign-up', '/register', '/forgot-password'];

const VALIDATION_TTL_MS = 60_000; // 60 seconds

function clearSessionCookies(response: NextResponse) {
  response.cookies.delete('session_token');
  response.cookies.delete('session_validated_at');
  response.cookies.delete('system_role');
  return response;
}

function redirectToLogin(request: NextRequest, returnTo?: string) {
  const loginUrl = new URL('/login', request.url);
  if (returnTo) loginUrl.searchParams.set('redirect', returnTo);

  return clearSessionCookies(NextResponse.redirect(loginUrl));
}

function authenticationUnavailable() {
  return NextResponse.json(
    { message: 'Authentication service unavailable. Please try again.' },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '5',
      },
    }
  );
}

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
    return redirectToLogin(request, targetUrl);
  }

  // 2. AUTHENTICATED: Re-validate token on protected routes if TTL expired
  if (token && isProtectedRoute) {
    const lastValidated = Number(request.cookies.get('session_validated_at')?.value);
    const now = Date.now();
    const validationExpired = !Number.isFinite(lastValidated)
      || lastValidated > now
      || now - lastValidated > VALIDATION_TTL_MS;

    if (validationExpired) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiBaseUrl) return authenticationUnavailable();

      try {
        const res = await fetch(`${apiBaseUrl}/me`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(30_000),
        });

        if (res.status === 401 || res.status === 403) {
          return redirectToLogin(request, `${pathname}${search}`);
        }

        if (!res.ok) return authenticationUnavailable();
      } catch {
        return authenticationUnavailable();
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
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      if (!apiBaseUrl) return NextResponse.next();

      const validation = await fetch(`${apiBaseUrl}/me`, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });

      if (validation.ok) {
        const data = await validation.json().catch(() => null);
        const systemRole = data?.user?.system_role ?? data?.system_role ?? 'user';
        const roleHome = systemRole === 'super_admin' || systemRole === 'admin'
          ? '/admin'
          : systemRole === 'facilitator_admin'
            ? '/facilitator'
            : '/dashboard';
        const fallbackRedirect = request.nextUrl.searchParams.get('redirect') || roleHome;
        const redirectUrl = fallbackRedirect.startsWith('/') ? fallbackRedirect : roleHome;
        const response = NextResponse.redirect(new URL(redirectUrl, request.url));
        response.cookies.set('system_role', systemRole, {
          path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        });
        return response;
      }

      if (validation.status === 401 || validation.status === 403) {
        return clearSessionCookies(NextResponse.next());
      }
    } catch {
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|be-api|_next/static|_next/image|push-sw\\.js|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
