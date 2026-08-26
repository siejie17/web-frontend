import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verificationCode: string }> },
) {
  const { verificationCode } = await params;

  try {
    const response = await fetch(`${BASE}/certificates/verify/${encodeURIComponent(verificationCode)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Certificate not found" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Verification service unavailable" }, { status: 502 });
  }
}
