import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  let lastError: unknown;

  try {
    const res = await fetch(`${apiBaseUrl}/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const response = NextResponse.json(
        data ?? { message: "Unable to fetch user" },
        { status: res.status },
      );
      if (res.status === 401 || res.status === 403) {
        response.cookies.delete("session_token");
        response.cookies.delete("session_validated_at");
        response.cookies.delete("system_role");
      }
      return response;
    }

    const response = NextResponse.json(
      { user: data?.user ?? data },
      { status: 200 },
    );
    const restoredUser = data?.user ?? data;
    response.cookies.set("system_role", restoredUser?.system_role || "user", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Backend unavailable" },
      { status: 502 },
    );
  }
}
