import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "10";

  try {
    const response = await fetch(`${BASE}/notifications?limit=${encodeURIComponent(limit)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { data: [] }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend unavailable", data: [] }, { status: 502 });
  }
}
