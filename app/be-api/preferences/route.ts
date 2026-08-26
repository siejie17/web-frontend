import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, method: "GET" | "PATCH") {
  const token = request.cookies.get("session_token")?.value;
  const userId = request.nextUrl.searchParams.get("userId");
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!userId) return NextResponse.json({ message: "userId is required" }, { status: 400 });

  const body = method === "PATCH" ? await request.text() : undefined;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/preferences`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Preference request failed" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export const GET = (request: NextRequest) => proxy(request, "GET");
export const PATCH = (request: NextRequest) => proxy(request, "PATCH");
