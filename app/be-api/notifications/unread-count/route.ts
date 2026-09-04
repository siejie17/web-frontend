import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${BASE}/notifications/unread-count`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(
      data ?? { count: 0 },
      { status: response.status },
    );
  } catch {
    return NextResponse.json({ message: "Backend unavailable", count: 0 }, { status: 502 });
  }
}
