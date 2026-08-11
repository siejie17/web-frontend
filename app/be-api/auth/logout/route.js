import { NextResponse } from 'next/server';

export async function POST(request) {
    const token = request.cookies.get('session_token')?.value;

    // Talk to Laravel with the same auth token used by /me
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        return NextResponse.json(data ?? { message: 'Unable to logout' }, { status: res.status });
    }

    const response = NextResponse.json({ message: data?.message || 'Logged out successfully' });
    response.cookies.delete('session_token');

    return response;
}