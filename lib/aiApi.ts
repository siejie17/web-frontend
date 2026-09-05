import type { AIRequestHistoryMessage } from "./aiConversation";

type AIResponse = {
  message?: string;
};

export async function sendMessageToAI(
  message: string,
  history: AIRequestHistoryMessage[],
): Promise<string> {
  const response = await fetch("/be-api/ai/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  const data = (await response.json().catch(() => null)) as AIResponse | null;

  if (!response.ok) {
    throw new Error(data?.message || "AI assistant unavailable. Please try again.");
  }

  if (!data?.message) {
    throw new Error("AI assistant returned an empty response.");
  }

  return data.message;
}
