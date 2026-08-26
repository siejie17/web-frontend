import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

type Context = {
  params: Promise<{ projectId: string; messageId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Context) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, messageId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${BASE}/projects/${projectId}/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: body.message }),
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to update message" }, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { projectId, messageId } = await params;

  try {
    const response = await fetch(`${BASE}/projects/${projectId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    if (response.ok) return NextResponse.json({ success: true });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Unable to delete message" }, { status: response.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
