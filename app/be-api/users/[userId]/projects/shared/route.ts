import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } | Promise<{ userId: string }> }
) {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.userId;

    try {
        const res = await fetch(`${apiBaseUrl}/users/${userId}/projects/added-to-me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json().catch(() => null);

        console.log(data);

        if (!res.ok) {
            return NextResponse.json(
                data ?? { message: "Unable to fetch shared projects" },
                { status: res.status }
            );
        }

        return NextResponse.json(data ?? { projects: [] }, { status: 200 });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Backend unavailable" },
            { status: 502 }
        );
    }
}