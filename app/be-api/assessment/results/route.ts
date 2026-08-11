import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const body = await request.json();

    const {
      projectName,
      buildingType,
      category,
      buildingClassification,
      has_management,
      year,
      buildingSize,
      projectBudget,
      state,
      region,
      structure,
      certifiedRatingScale,
    } = body;

    const res = await fetch(`${apiBaseUrl}/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Assessment received.",
      data: data,
    });
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
