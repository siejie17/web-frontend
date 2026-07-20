import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const userId = new URL(request.url).searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { message: "userId is required" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${apiBaseUrl}/user/update-password`, {
      method: "PUT",
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
        data ?? { message: "Unable to update user preferences" },
        { status: res.status }
      );
    }

    return NextResponse.json(data ?? { preferences: body }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Backend unavailable" },
      { status: 502 }
    );
  }
}
