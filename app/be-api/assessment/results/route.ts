import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const start = performance.now();

  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const body = await request.json();

    console.log(
      `[Assessment] request.json: ${(performance.now() - start).toFixed(0)}ms`
    );

    const backendStart = performance.now();

    const res = await fetch(`${apiBaseUrl}/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log(
      `[Assessment] backend fetch: ${(performance.now() - backendStart).toFixed(0)}ms`
    );

    const data = await res.json().catch(() => null);

    console.log(
      `[Assessment] total: ${(performance.now() - start).toFixed(0)}ms`
    );

    return NextResponse.json(
      {
        success: res.ok,
        message: res.ok
          ? "Assessment received."
          : "Assessment failed.",
        data,
      },
      { status: res.status }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body.",
      },
      { status: 400 }
    );
  }
}