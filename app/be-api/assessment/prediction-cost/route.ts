import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, message: "Unauthenticated" },
            { status: 401 }
        );
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL!;

    try {
        const body = await request.json();

        const response = await fetch(
            `${apiBaseUrl}/assessment/prediction-cost`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                cache: "no-store",
            }
        );

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message: "Backend unavailable",
            },
            {
                status: 502,
            }
        );
    }
}
