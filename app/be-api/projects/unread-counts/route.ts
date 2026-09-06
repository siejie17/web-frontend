import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const response = await fetch(`${BASE}/projects/unread-counts`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { counts: {} }, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable", counts: {} }, { status: 502 });
  }
}
