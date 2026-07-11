import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES: string[] = ['/login', '/sign-up', '/forgot-password'];
const APP_ROUTES: string[] = ['/dashboard', '/admin', '/super-admin', '/assessments', '/projects', '/home', '/profile', '/settings', '/orders'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname, search } = request.nextUrl;
  const isAdminPreview =
    process.env.NEXT_PUBLIC_ADMIN_PREVIEW_MODE === 'true' &&
    (pathname.startsWith('/admin') || pathname.startsWith('/super-admin'));

  // 1. NOT LOGGED IN & trying to access an App route
  if (!token && !isAdminPreview && APP_ROUTES.some(route => pathname.startsWith(route))) {
    const targetUrl = `${pathname}${search}`;
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', targetUrl);
    
    return NextResponse.redirect(loginUrl);
  }

  // 2. IS LOGGED IN & trying to access Auth routes (like /login)
  if (token && AUTH_ROUTES.includes(pathname)) {
    const fallbackRedirect = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(fallbackRedirect, request.url));
  }

  return NextResponse.next();
}

// Ensure middleware runs across your standard pages while ignoring asset bundles/chunks
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
