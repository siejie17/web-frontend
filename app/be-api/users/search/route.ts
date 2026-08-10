import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = request.nextUrl.searchParams.get("limit") ?? "10";
  const exclude = (request.nextUrl.searchParams.get("exclude") ?? "")
    .split(",")
    .filter(Boolean);

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", limit);
  exclude.forEach((id) => qs.append("exclude_ids", id));
  const query = qs.toString();

  try {
    const res = await fetch(`${BASE}/users${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : [];
    return NextResponse.json({ users: list }, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json({ message: "Backend unavailable", users: [] }, { status: 502 });
  }
}