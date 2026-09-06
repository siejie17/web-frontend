import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/be-api/content/[type]">,
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const { type } = await context.params;
  if (type !== "recommendations" && type !== "references") {
    return NextResponse.json({ message: "Content type not found." }, { status: 404 });
  }

  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/content/${type}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();

    return new NextResponse(body || null, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { message: timedOut ? "Content request timed out." : "Content service unavailable." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
