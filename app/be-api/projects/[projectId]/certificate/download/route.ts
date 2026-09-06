import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;

  try {
    const response = await fetch(`${BASE}/projects/${projectId}/certificate/download`, {
      headers: { Accept: "application/pdf", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(data ?? { message: "Unable to download certificate" }, { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": response.headers.get("content-disposition") ?? "attachment; filename=certificate.pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
