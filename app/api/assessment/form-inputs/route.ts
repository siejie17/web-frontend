import { NextRequest, NextResponse } from "next/server";

export async function GET( request: NextRequest ) {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
        const res = await fetch(`${apiBaseUrl}/form-inputs`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return NextResponse.json(
                data ?? { message: "Unable to fetch form inputs" },
                { status: res.status }
            );
        }

        return NextResponse.json(data ?? { formInputs: [] }, { status: 200 });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Backend unavailable" },
            { status: 502 }
        );
    }
}
