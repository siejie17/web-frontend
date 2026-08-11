import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  try {
    // Forward the client's multipart FormData straight to Laravel (field: "file").
    const res = await fetch(`${BASE}/projects/${projectId}/attachments`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: await request.formData(),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to upload attachment" }, { status: res.ok ? 201 : res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}