import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, method: "GET" | "POST" | "DELETE") {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const path = method === "GET" ? "/push/config" : "/push/subscriptions";
  const body = method === "GET" ? undefined : await request.text();
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
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
    return NextResponse.json(data ?? { message: "Push subscription request failed" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export const GET = (request: NextRequest) => proxy(request, "GET");
export const POST = (request: NextRequest) => proxy(request, "POST");
export const DELETE = (request: NextRequest) => proxy(request, "DELETE");
