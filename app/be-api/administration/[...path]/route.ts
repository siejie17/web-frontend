import { NextRequest, NextResponse } from "next/server";

async function forward(request: NextRequest, context: RouteContext<"/be-api/administration/[...path]">) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });

  const { path } = await context.params;
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  const url = new URL(`${apiBaseUrl}/administration/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const fileName = request.headers.get("x-file-name");
  const isDocumentUpload = path.join("/") === "admin/references/upload";
  let response: Response;
  try {
    response = await fetch(url, {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers.get("content-type") || "application/json",
        Authorization: `Bearer ${token}`,
        ...(fileName ? { "X-File-Name": fileName } : {}),
      },
      body: hasBody ? await request.arrayBuffer() : undefined,
      signal: AbortSignal.timeout(isDocumentUpload ? 120_000 : 15_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { message: timedOut ? "Administration request timed out." : "Administration service unavailable." },
      { status: timedOut ? 504 : 502 },
    );
  }

  const body = await response.text();
  return new NextResponse(body || null, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
