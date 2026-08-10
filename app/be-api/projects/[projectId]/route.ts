import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const cookie = _request.cookies.get("session_token");

    if (!cookie) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    const { projectId } = await params;

    try {
        const res = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${cookie.value}`,
            },
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                data ?? { message: "Unable to fetch project details" },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Backend unavailable" },
            { status: 502 }
        );
    }
}
