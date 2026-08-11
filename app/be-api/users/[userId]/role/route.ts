import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json(
      { message: "userId is required" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${apiBaseUrl}/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { message: "Unable to update role" },
        { status: res.status }
      );
    }

    return NextResponse.json(data ?? { success: true }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Backend unavailable" },
      { status: 502 }
    );
  }
}
