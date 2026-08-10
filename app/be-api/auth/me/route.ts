import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log(process.env.NEXT_PUBLIC_API_URL)
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;



    let lastError: unknown;

    try {
        const res = await fetch(`${apiBaseUrl}/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const response = NextResponse.json(
                data ?? { message: "Unable to fetch user" },
                { status: res.status }
            );
            response.cookies.delete("session_token");
            return response;
        }

        return NextResponse.json(
            { user: data?.user ?? data },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Backend unavailable" },
            { status: 502 }
        );
    }
}
