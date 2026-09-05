export const MAX_STORED_AI_MESSAGES = 100;
export const MAX_AI_CONTEXT_MESSAGES = 24;
export const MAX_AI_MESSAGE_LENGTH = 10_000;
export const AI_CONVERSATION_CLEARED_EVENT =
  "proformax:ai-conversation-cleared";

export type AIRequestHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIConversationMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  includeInContext?: boolean;
};

export function getAIConversationStorageKey(userId: string | number): string {
  return `proformax.ai.conversation.${userId}`;
}

export function serializeAIConversation(
  messages: AIConversationMessage[],
): string {
  return JSON.stringify(
    messages.slice(-MAX_STORED_AI_MESSAGES).map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
  );
}

export function parseAIConversation(value: string | null): AIConversationMessage[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((candidate): AIConversationMessage[] => {
        if (typeof candidate !== "object" || candidate === null) return [];

        const message = candidate as Record<string, unknown>;
        const timestamp = new Date(
          typeof message.timestamp === "string" ? message.timestamp : "",
        );

        if (
          typeof message.id !== "string" ||
          typeof message.text !== "string" ||
          (message.sender !== "user" && message.sender !== "bot") ||
          Number.isNaN(timestamp.getTime())
        ) {
          return [];
        }

        return [
          {
            id: message.id,
            text: message.text,
            sender: message.sender,
            timestamp,
            ...(typeof message.includeInContext === "boolean"
              ? { includeInContext: message.includeInContext }
              : {}),
          },
        ];
      })
      .slice(-MAX_STORED_AI_MESSAGES);
  } catch {
    return [];
  }
}

export function loadAIConversation(
  storage: Pick<Storage, "getItem">,
  userId: string | number,
): AIConversationMessage[] {
  try {
    return parseAIConversation(
      storage.getItem(getAIConversationStorageKey(userId)),
    );
  } catch {
    return [];
  }
}

export function saveAIConversation(
  storage: Pick<Storage, "setItem">,
  userId: string | number,
  messages: AIConversationMessage[],
): void {
  storage.setItem(
    getAIConversationStorageKey(userId),
    serializeAIConversation(messages),
  );
}

export function clearAIConversation(
  storage: Pick<Storage, "removeItem">,
  userId: string | number,
): string {
  const storageKey = getAIConversationStorageKey(userId);
  storage.removeItem(storageKey);
  return storageKey;
}

export function buildAIRequestHistory(
  messages: AIConversationMessage[],
  currentMessage: string,
): AIRequestHistoryMessage[] {
  const current = currentMessage.trim();
  const history = messages.flatMap((message): AIRequestHistoryMessage[] => {
    const content = message.text.trim();

    if (
      message.id === "welcome" ||
      message.includeInContext === false ||
      !content ||
      content.length > MAX_AI_MESSAGE_LENGTH
    ) {
      return [];
    }

    return [
      {
        role: message.sender === "user" ? "user" : "assistant",
        content,
      },
    ];
  });

  if (
    history.at(-1)?.role === "user" &&
    history.at(-1)?.content === current
  ) {
    history.pop();
  }

  return history.slice(-(MAX_AI_CONTEXT_MESSAGES - 1));
}
