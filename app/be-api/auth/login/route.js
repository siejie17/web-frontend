import { NextResponse } from 'next/server';

export async function POST(request) {
    const { email, password } = await request.json();
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

    // 1. Talk to Laravel
    const res = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
    }

    // 2. intercepted check: If email isn't verified, return user data WITHOUT setting the cookie
    if (!data.user.email_verified_at) {
        return NextResponse.json({ user: data.user, success: false, reason: 'unverified' });
    }

    // 3. User is verified -> Bake the secure cookie
    const response = NextResponse.json({ user: data.user, success: true });
    
    response.cookies.set('session_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });

    return response;
}