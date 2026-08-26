import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const since = request.nextUrl.searchParams.get("since") ?? "";

  try {
    const response = await fetch(
      `${BASE}/projects/${projectId}/messages/changes?since=${encodeURIComponent(since)}`,
      {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to synchronize messages" }, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
