import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; attachmentId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, attachmentId } = await params;
  try {
    const response = await fetch(`${BASE}/projects/${projectId}/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to remove evidence" }, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
