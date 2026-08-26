import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const hasBody = request.method === "POST";

  try {
    const response = await fetch(`${BASE}/projects/${projectId}/facilitators`, {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: hasBody ? await request.text() : undefined,
    });
    const body = await response.text();
    return new NextResponse(body || null, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
