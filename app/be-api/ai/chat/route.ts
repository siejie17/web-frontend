import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const MODEL_QUEUE = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
const MAX_MESSAGE_LENGTH = 10_000;

function isUnavailableError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { status?: unknown; message?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return (
    candidate.status === "UNAVAILABLE" ||
    message.includes("503") ||
    message.toLowerCase().includes("high demand")
  );
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Please sign in again." }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "AI assistant is not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { message: `Message must be between 1 and ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.` },
      { status: 400 },
    );
  }

  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");

  try {
    const authResponse = await fetch(`${apiBaseUrl}/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!authResponse.ok) {
      return NextResponse.json({ message: "Please sign in again." }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { message: "Unable to verify your session." },
      { status: 503 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  for (const model of MODEL_QUEUE) {
    try {
      const response = await ai.models.generateContent({ model, contents: message });
      const text = response.text?.trim();

      if (!text) throw new Error("Gemini returned an empty response.");

      return NextResponse.json({ message: text });
    } catch (error) {
      if (isUnavailableError(error) && model !== MODEL_QUEUE.at(-1)) continue;

      console.error(`Gemini API error on ${model}:`, error);
      return NextResponse.json(
        { message: "AI assistant unavailable. Please try again." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { message: "AI assistant unavailable. Please try again." },
    { status: 502 },
  );
}
