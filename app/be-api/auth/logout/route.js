import { NextResponse } from 'next/server';

export async function POST(request) {
    const token = request.cookies.get('session_token')?.value;

    let message = 'Logged out successfully';
    if (token) {
        try {
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
            if (res.ok && data?.message) message = data.message;
        } catch {
            // Local cookies still need to be cleared when the API is unavailable.
        }
    }

    const response = NextResponse.json({ message });
    response.cookies.delete('session_token');
    response.cookies.delete('session_validated_at');
    response.cookies.delete('system_role');

    return response;
}
