import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; assignmentId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, assignmentId } = await params;

  try {
    const response = await fetch(`${BASE}/projects/${projectId}/facilitators/${assignmentId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
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
