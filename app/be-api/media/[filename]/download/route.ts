import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { filename } = await params;
  const base = (BASE ?? "").replace(/\/$/, "");

  try {
    const res = await fetch(
      `${base}/media/${encodeURIComponent(filename)}/download`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Unable to download media" },
        { status: res.status },
      );
    }

    // Forward the binary with the original filename/content-type so the
    // browser saves the real file (the Laravel endpoint sets Content-Disposition
    // attachment with the original name).
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition":
          res.headers.get("content-disposition") ??
          'attachment; filename="download"',
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}