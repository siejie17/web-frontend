import { NextRequest, NextResponse } from "next/server.js";
import {
  generateAssistantResponse,
  getOpenAIConfig,
  normalizeAssistantRole,
  safeProviderErrorDetails,
  validateAssistantHistory,
  type AssistantRole,
  type OpenAIConfig,
} from "../../../../lib/server/aiAssistant.ts";

import { MAX_AI_MESSAGE_LENGTH } from "../../../../lib/aiConversation.ts";

type AuthenticatedAssistantUser = { role: AssistantRole };

type HandlerDependencies = {
  getConfig: () => OpenAIConfig;
  verifySession: (token: string) => Promise<AuthenticatedAssistantUser | null>;
  generate: typeof generateAssistantResponse;
  logProviderError: (details: ReturnType<typeof safeProviderErrorDetails>) => void;
};

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");
}

async function verifySession(token: string): Promise<AuthenticatedAssistantUser | null> {
  const authResponse = await fetch(`${apiBaseUrl()}/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(5_000),
  });

  if (!authResponse.ok) return null;

  const data = (await authResponse.json().catch(() => null)) as
    | { system_role?: unknown; user?: { system_role?: unknown } }
    | null;

  return {
    role: normalizeAssistantRole(data?.user?.system_role ?? data?.system_role),
  };
}

const defaultDependencies: HandlerDependencies = {
  getConfig: getOpenAIConfig,
  verifySession,
  generate: generateAssistantResponse,
  logProviderError: (details) => console.error("OpenAI API request failed.", details),
};

export function createChatHandler(
  overrides: Partial<HandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: NextRequest) {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Please sign in again." },
        { status: 401 },
      );
    }

    let config: OpenAIConfig;
    try {
      config = dependencies.getConfig();
    } catch {
      return NextResponse.json(
        { message: "AI assistant is not configured yet." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      history?: unknown;
      message?: unknown;
    } | null;
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message || message.length > MAX_AI_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          message: `Message must be between 1 and ${MAX_AI_MESSAGE_LENGTH.toLocaleString()} characters.`,
        },
        { status: 400 },
      );
    }

    let history;
    try {
      history = validateAssistantHistory(body?.history);
    } catch {
      return NextResponse.json(
        { message: "Conversation history is invalid." },
        { status: 400 },
      );
    }

    let authenticatedUser: AuthenticatedAssistantUser | null;
    try {
      authenticatedUser = await dependencies.verifySession(token);
      if (!authenticatedUser) {
        return NextResponse.json(
          { message: "Please sign in again." },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { message: "Unable to verify your session." },
        { status: 503 },
      );
    }

    try {
      const text = await dependencies.generate({
        config,
        history,
        message,
        role: authenticatedUser.role,
      });

      return NextResponse.json({ message: text });
    } catch (error) {
      dependencies.logProviderError(safeProviderErrorDetails(error));
      return NextResponse.json(
        { message: "AI assistant unavailable. Please try again." },
        { status: 502 },
      );
    }
  };
}

export const POST = createChatHandler();
