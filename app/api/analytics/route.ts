import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const query = type ? `?type=${encodeURIComponent(type)}` : "";

  try {
    const response = await fetch(`${BASE.replace(/\/$/, "")}/analytics${query}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        data ?? { message: "Unable to fetch analytics" },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? {
      types: [],
      filters: { type: null },
      metrics: {
        total_projects: 0,
        potential_cost_savings: 0,
        average_predicted_gbi_score: 0,
        certified_projects: 0,
      },
      cost_trend: [],
      recent_projects: [],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
