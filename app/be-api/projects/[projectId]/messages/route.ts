import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const qs = new URLSearchParams();
  const before = request.nextUrl.searchParams.get("before");
  const limit = request.nextUrl.searchParams.get("limit");
  if (before) qs.set("before", before);
  if (limit) qs.set("limit", limit);
  const query = qs.toString();

  try {
    const res = await fetch(`${BASE}/projects/${projectId}/messages${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to fetch messages" }, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${BASE}/projects/${projectId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: body.message,
        attachment_id: body.attachmentId ?? body.attachment_id,
        reply_to_id: body.replyToId ?? body.reply_to_id,
      }),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to send message" }, { status: res.ok ? 201 : res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}