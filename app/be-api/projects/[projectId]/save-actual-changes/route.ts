import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    const { projectId } = await params;
    const body = await request.json();

    try {
        const res = await fetch(
            `${apiBaseUrl}/projects/${projectId}/save-actual-changes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ actualChanges: body.actualChanges }),
            }
        );

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                data ?? { message: "Unable to save actual assessment" },
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
