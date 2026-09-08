import { NextRequest, NextResponse } from "next/server.js";

import {
  generateGbiRecommendations,
  type GbiRecommendationResponse,
} from "../../../../lib/server/gbiRecommendations.ts";

import { getOpenAIConfig, safeProviderErrorDetails } from "../../../../lib/server/aiAssistant.ts";

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");
}

async function verifySession(token: string): Promise<boolean> {
  try {
    const authResponse = await fetch(`${apiBaseUrl()}/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5_000),
    });

    return authResponse.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Please sign in again." },
      { status: 401 },
    );
  }

  let config: ReturnType<typeof getOpenAIConfig>;
  try {
    config = getOpenAIConfig();
  } catch {
    return NextResponse.json(
      { message: "GBI recommendations are not configured yet." },
      { status: 503 },
    );
  }

  let verified: boolean;
  try {
    verified = await verifySession(token);
  } catch {
    verified = false;
  }

  if (!verified) {
    return NextResponse.json(
      { message: "Please sign in again." },
      { status: 401 },
    );
  }

  try {
    const result: GbiRecommendationResponse = await generateGbiRecommendations({
      apiKey: config.apiKey,
      model: config.model,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("OpenAI GBI recommendations request failed.", safeProviderErrorDetails(error));
    return NextResponse.json(
      { message: "GBI recommendations unavailable. Please try again." },
      { status: 502 },
    );
  }
}
