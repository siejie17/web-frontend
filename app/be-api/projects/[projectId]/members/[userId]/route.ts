import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, userId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${BASE}/projects/${projectId}/members/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to update member role" }, { status: res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, userId } = await params;
  try {
    const res = await fetch(`${BASE}/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    if (res.ok) return NextResponse.json({ success: true }, { status: 200 });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to remove member" }, { status: res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
