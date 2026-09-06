import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_AI_CONTEXT_MESSAGES,
  MAX_STORED_AI_MESSAGES,
  buildAIRequestHistory,
  clearAIConversation,
  getAIConversationStorageKey,
  loadAIConversation,
  parseAIConversation,
  saveAIConversation,
  serializeAIConversation,
} from "./aiConversation.ts";

const aiAvatarSource = readFileSync(
  new URL("../components/ai/AIAvatar.tsx", import.meta.url),
  "utf8",
);
const authContextSource = readFileSync(
  new URL("../contexts/AuthContext.tsx", import.meta.url),
  "utf8",
);
const clientLayoutSource = readFileSync(
  new URL("../app/(authenticated)/layout.tsx", import.meta.url),
  "utf8",
);
const administrationShellSource = readFileSync(
  new URL("../components/administration/AdministrationShell.tsx", import.meta.url),
  "utf8",
);

test("AI conversations use a separate storage key for each authenticated user", () => {
  assert.equal(
    getAIConversationStorageKey("user-12"),
    "proformax.ai.conversation.user-12",
  );
  assert.notEqual(
    getAIConversationStorageKey("user-12"),
    getAIConversationStorageKey("user-13"),
  );
});

test("AI conversation messages survive serialization with timestamps restored", () => {
  const messages = [
    {
      id: "1",
      text: "Explain this GBI item",
      sender: "user",
      timestamp: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: "2",
      text: "Here is the explanation.",
      sender: "bot",
      timestamp: new Date("2026-09-01T10:00:01.000Z"),
    },
  ];

  const restored = parseAIConversation(serializeAIConversation(messages));

  assert.deepEqual(restored, messages);
  assert.equal(restored[0].timestamp instanceof Date, true);
});

test("invalid stored conversation data is ignored safely", () => {
  assert.deepEqual(parseAIConversation("not-json"), []);
  assert.deepEqual(parseAIConversation('{"unexpected":true}'), []);
  assert.deepEqual(
    parseAIConversation(
      JSON.stringify([
        { id: "1", text: "valid", sender: "bot", timestamp: "invalid" },
      ]),
    ),
    [],
  );
});

test("stored AI conversation history is bounded", () => {
  const messages = Array.from(
    { length: MAX_STORED_AI_MESSAGES + 5 },
    (_, index) => ({
      id: String(index),
      text: `message ${index}`,
      sender: index % 2 === 0 ? "user" : "bot",
      timestamp: new Date(1_700_000_000_000 + index),
    }),
  );

  const restored = parseAIConversation(serializeAIConversation(messages));

  assert.equal(restored.length, MAX_STORED_AI_MESSAGES);
  assert.equal(restored[0].id, "5");
});

test("request history contains only sanitized prior conversation content", () => {
  const messages = [
    {
      id: "welcome",
      text: "Welcome",
      sender: "bot",
      timestamp: new Date(),
      includeInContext: false,
    },
    {
      id: "1",
      text: " Remember PINEAPPLE. ",
      sender: "user",
      timestamp: new Date(),
    },
    {
      id: "2",
      text: "Understood.",
      sender: "bot",
      timestamp: new Date(),
    },
    {
      id: "error",
      text: "AI assistant unavailable.",
      sender: "bot",
      timestamp: new Date(),
      includeInContext: false,
    },
  ];

  assert.deepEqual(buildAIRequestHistory(messages, "What is my test word?"), [
    { role: "user", content: "Remember PINEAPPLE." },
    { role: "assistant", content: "Understood." },
  ]);
});

test("request history excludes a duplicated current user message", () => {
  const current = "What is my test word?";
  const messages = [
    {
      id: "1",
      text: current,
      sender: "user",
      timestamp: new Date(),
    },
  ];

  assert.deepEqual(buildAIRequestHistory(messages, current), []);
});

test("browser request history uses the configured recent context window", () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    id: String(index),
    text: `message ${index}`,
    sender: index % 2 === 0 ? "user" : "bot",
    timestamp: new Date(1_700_000_000_000 + index),
  }));

  const history = buildAIRequestHistory(messages, "current");

  assert.equal(history.length, MAX_AI_CONTEXT_MESSAGES - 1);
  assert.equal(history[0].content, "message 17");
  assert.equal(history.at(-1).content, "message 39");
});

test("loading one account never returns another account's conversation", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const accountAMessages = [
    {
      id: "a1",
      text: "Account A private conversation",
      sender: "user",
      timestamp: new Date("2026-09-01T10:00:00.000Z"),
    },
  ];

  saveAIConversation(storage, "account-a", accountAMessages);

  assert.deepEqual(loadAIConversation(storage, "account-b"), []);
  assert.deepEqual(loadAIConversation(storage, "account-a"), accountAMessages);
});

test("refreshing restores the same conversation from session storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const messages = [
    {
      id: "refresh-1",
      text: "Remember this test value: 12345",
      sender: "user",
      timestamp: new Date("2026-09-01T10:00:00.000Z"),
    },
  ];

  saveAIConversation(storage, "account-a", messages);

  assert.deepEqual(loadAIConversation(storage, "account-a"), messages);
});

test("the same account key preserves conversation across layouts and routes", () => {
  const clientKey = getAIConversationStorageKey("elevated-user");
  const adminKey = getAIConversationStorageKey("elevated-user");

  assert.equal(clientKey, adminKey);
  assert.equal(clientKey, "proformax.ai.conversation.elevated-user");
});

test("logout removes only the authenticated user's AI conversation", () => {
  const values = new Map([
    [getAIConversationStorageKey("account-a"), "account-a-chat"],
    [getAIConversationStorageKey("account-b"), "account-b-chat"],
    ["assessment_result", "unrelated-session-data"],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
  };

  const removedKey = clearAIConversation(storage, "account-a");

  assert.equal(removedKey, "proformax.ai.conversation.account-a");
  assert.equal(storage.getItem(removedKey), null);
  assert.equal(
    storage.getItem(getAIConversationStorageKey("account-b")),
    "account-b-chat",
  );
  assert.equal(storage.getItem("assessment_result"), "unrelated-session-data");
});

test("logging back into a cleared account starts with no restored messages", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const messages = [
    {
      id: "private-a",
      text: "Account A private conversation",
      sender: "user",
      timestamp: new Date("2026-09-01T10:00:00.000Z"),
    },
  ];

  saveAIConversation(storage, "account-a", messages);
  clearAIConversation(storage, "account-a");

  assert.deepEqual(loadAIConversation(storage, "account-a"), []);
  assert.deepEqual(loadAIConversation(storage, "account-b"), []);
});

test("closing and reopening the popup changes visibility without clearing chat", () => {
  const closeButtonIndex = aiAvatarSource.indexOf('aria-label="Close chat"');
  const closeButtonSource = aiAvatarSource.slice(
    Math.max(0, closeButtonIndex - 250),
    closeButtonIndex + 100,
  );

  assert.notEqual(closeButtonIndex, -1);
  assert.match(closeButtonSource, /setOpen\(false\)/);
  assert.doesNotMatch(
    closeButtonSource,
    /clearAIConversation|removeItem|setMessages/,
  );
});

test("AI conversation lifecycle remains sessionStorage-only", () => {
  const lifecycleSource = `${aiAvatarSource}\n${authContextSource}`;

  assert.match(lifecycleSource, /window\.sessionStorage/);
  assert.doesNotMatch(lifecycleSource, /localStorage|indexedDB/i);
});

test("all visible logout buttons use the shared lifecycle-aware logout", () => {
  assert.match(clientLayoutSource, /const \{ user, logout \} = useAuth\(\)/);
  assert.match(administrationShellSource, /const \{ user, logout \} = useAuth\(\)/);
  assert.doesNotMatch(clientLayoutSource, /be-api\/auth\/logout/);
  assert.doesNotMatch(administrationShellSource, /be-api\/auth\/logout/);
  assert.match(authContextSource, /clearAIConversation\(window\.sessionStorage, user\.id\)/);
});

test("logout clear notification resets in-memory assistant state", () => {
  const handlerStart = aiAvatarSource.indexOf(
    "const handleConversationCleared = (event: Event)",
  );
  const handlerEnd = aiAvatarSource.indexOf(
    "window.addEventListener(",
    handlerStart,
  );
  const handlerSource = aiAvatarSource.slice(handlerStart, handlerEnd);

  assert.notEqual(handlerStart, -1);
  assert.match(handlerSource, /setLoadedStorageKey\(null\)/);
  assert.match(handlerSource, /setMessages\(\[createWelcomeMessage\(\)\]\)/);
  assert.match(handlerSource, /setInputText\(''\)/);
  assert.match(handlerSource, /setLoading\(false\)/);
  assert.match(handlerSource, /conversationVersionRef\.current \+= 1/);
});

test("AI assistant remains interactive above administration assessment dialogs", () => {
  assert.match(
    aiAvatarSource,
    /fixed bottom-7 right-7 z-\[100\]/,
  );
  assert.match(
    aiAvatarSource,
    /fixed inset-0 z-\[100\] bg-ink\/30/,
  );
  assert.match(
    aiAvatarSource,
    /fixed inset-x-0 bottom-0 z-\[110\]/,
  );
});
