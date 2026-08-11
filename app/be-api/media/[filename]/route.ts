import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

function stripApiSuffix(base: string): string {
  // NEXT_PUBLIC_API_URL already ends in /api (e.g. http://127.0.0.1:8000/api).
  // The media route is /api/media/{filename}, so forward to `${base}/media/...`.
  return base.replace(/\/$/, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { filename } = await params;
  const base = stripApiSuffix(BASE ?? "");

  try {
    const res = await fetch(`${base}/media/${encodeURIComponent(filename)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Unable to fetch media" },
        { status: res.status },
      );
    }

    // Forward the binary body with the original content-type so the browser
    // can render images/PDFs inline (used by <img> and <iframe>).
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": res.headers.get("content-disposition") ?? "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}