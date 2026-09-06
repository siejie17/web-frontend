'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, User, X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessageToAI } from '@/lib/aiApi';
import {
  AI_CONVERSATION_CLEARED_EVENT,
  buildAIRequestHistory,
  getAIConversationStorageKey,
  loadAIConversation,
  saveAIConversation,
  type AIConversationMessage as Message,
} from '@/lib/aiConversation';

const assistantMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="my-2 first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-[15px] font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
  ),
};

function createWelcomeMessage(): Message {
  return {
    id: 'welcome',
    text: "Hello! I'm your AI assistant. How can I help you today?",
    sender: 'bot',
    timestamp: new Date(),
    includeInContext: false,
  };
}

function UserAvatar({ name, profilePic }: { name: string; profilePic?: string }) {
  if (profilePic) {
    return (
      <img
        src={`data:image/jpeg;base64,${profilePic}`}
        alt={name}
        className="h-7 w-7 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E2621] text-[10px] font-bold text-[#F6F6F2] ring-2 ring-white">
      {initials || <User size={12} />}
    </div>
  );
}

function ProFormaAIIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="3 2.5 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.25 15.05C5.25 8.78 9.65 4.5 21.7 4.5c0 11.83-4.19 17.1-11.04 17.1-3.2 0-5.41-2.58-5.41-6.55Z"
        fill="#E8C27E"
        fillOpacity="0.14"
        stroke="#E8C27E"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 23.15c2.43-5.2 5.53-9.35 10.7-13.55M11.1 17.62l-.15-4.25M13.68 14.02l3.62.3"
        stroke="#F7F4EA"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.94" cy="12.65" r="1.45" fill="#E8C27E" stroke="#1E2621" strokeWidth="0.7" />
      <circle cx="18.08" cy="9.42" r="1.45" fill="#E8C27E" stroke="#1E2621" strokeWidth="0.7" />
      <circle cx="18.1" cy="14.4" r="1.45" fill="#E8C27E" stroke="#1E2621" strokeWidth="0.7" />
    </svg>
  );
}

function BotAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#2B3A31] to-[#1E2621] shadow-sm ring-2 ring-white">
      <ProFormaAIIcon size={17} />
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Groups consecutive messages from the same sender so avatars/timestamps
// only render once per "turn" instead of once per bubble.
function groupMessages(messages: Message[]) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    return {
      ...msg,
      isFirstInGroup: !prev || prev.sender !== msg.sender,
      isLastInGroup: !next || next.sender !== msg.sender,
    };
  });
}

export default function AIAvatar({ showLauncher = true }: { showLauncher?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage()]);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnreadResponse, setHasUnreadResponse] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationVersionRef = useRef(0);
  const openRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    openRef.current = open;
    if (open) setHasUnreadResponse(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      const messageList = messagesRef.current;
      if (messageList) messageList.scrollTop = messageList.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, loadedStorageKey]);

  const authenticatedUserId = user?.id ?? null;
  const conversationStorageKey = authenticatedUserId
    ? getAIConversationStorageKey(authenticatedUserId)
    : null;

  useEffect(() => {
    conversationVersionRef.current += 1;
    setLoadedStorageKey(null);
    setHasUnreadResponse(false);

    if (!conversationStorageKey || !authenticatedUserId) {
      setMessages([createWelcomeMessage()]);
      return;
    }

    const restored = loadAIConversation(
      window.sessionStorage,
      authenticatedUserId,
    );
    setMessages(restored.length > 0 ? restored : [createWelcomeMessage()]);
    setLoadedStorageKey(conversationStorageKey);
  }, [authenticatedUserId, conversationStorageKey]);

  useEffect(() => {
    const handleConversationCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey?: string }>).detail;
      if (!conversationStorageKey || detail?.storageKey !== conversationStorageKey) {
        return;
      }

      conversationVersionRef.current += 1;
      setLoadedStorageKey(null);
      setMessages([createWelcomeMessage()]);
      setInputText('');
      setLoading(false);
      setHasUnreadResponse(false);
    };

    window.addEventListener(
      AI_CONVERSATION_CLEARED_EVENT,
      handleConversationCleared,
    );
    return () =>
      window.removeEventListener(
        AI_CONVERSATION_CLEARED_EVENT,
        handleConversationCleared,
      );
  }, [conversationStorageKey]);

  useEffect(() => {
    if (
      !conversationStorageKey ||
      !authenticatedUserId ||
      loadedStorageKey !== conversationStorageKey
    ) {
      return;
    }

    try {
      saveAIConversation(window.sessionStorage, authenticatedUserId, messages);
    } catch {
      // The in-memory conversation still works when browser storage is unavailable.
    }
  }, [authenticatedUserId, conversationStorageKey, loadedStorageKey, messages]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener("open-ai-assistant", openAssistant);
    return () => window.removeEventListener("open-ai-assistant", openAssistant);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 96)}px`;
    }
  }, [inputText]);

  const handleSend = async () => {
    const text = inputText.trim();
    const conversationReady =
      Boolean(conversationStorageKey) &&
      loadedStorageKey === conversationStorageKey;
    if (!text || loading || !conversationReady) return;

    const history = buildAIRequestHistory(messages, text);
    const conversationVersion = conversationVersionRef.current;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await sendMessageToAI(text, history);
      if (conversationVersion !== conversationVersionRef.current) return;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (!openRef.current) setHasUnreadResponse(true);
    } catch (error) {
      if (conversationVersion !== conversationVersionRef.current) return;
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text:
          error instanceof Error
            ? error.message
            : 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        includeInContext: false,
      };

      setMessages((prev) => [
        ...prev.map((message) =>
          message.id === userMsg.id
            ? { ...message, includeInContext: false }
            : message,
        ),
        errorMsg,
      ]);
      if (!openRef.current) setHasUnreadResponse(true);
    } finally {
      if (conversationVersion === conversationVersionRef.current) {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupMessages(messages);
  const conversationReady =
    Boolean(conversationStorageKey) &&
    loadedStorageKey === conversationStorageKey;

  return (
    <>
      {!open && showLauncher && (
        <div className="fixed bottom-7 right-7 z-[100]">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Open AI assistant"
            className="group relative flex h-14 w-14 items-center justify-center overflow-visible rounded-full bg-linear-to-br from-[#29382F] via-[#1E2621] to-[#17201B] shadow-[0_10px_28px_rgba(30,38,33,0.28)] ring-1 ring-white/15 transition-transform hover:scale-105 active:scale-95"
          >
            <span className="absolute -inset-1 rounded-full border-[1.5px] border-[#C08A3E]/50" />

            <span className="absolute inset-1 rounded-full border border-[#E8C27E]/15 transition-colors group-hover:border-[#E8C27E]/35" />

            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key="proformax-neural-leaf"
                initial={{ scale: 0.72, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.72, opacity: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                className="relative flex transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
              >
                <ProFormaAIIcon size={32} />
              </motion.span>
            </AnimatePresence>

            {hasUnreadResponse && (
              <span
                aria-label="Unread assistant response"
                className="absolute right-0.5 top-0.5 h-2.25 w-2.25 rounded-full border-2 border-[#1E2621] bg-[#C08A3E]"
              />
            )}
          </button>
        </div>
      )}

      {/* Panel — anchored to the bottom-right corner, above the launcher */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobile-only scrim so the sheet reads as a modal on small screens */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-ink/30 sm:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              style={{ transformOrigin: 'bottom right' }}
              className="fixed inset-x-0 bottom-0 z-[110] flex h-[88vh] w-full flex-col overflow-hidden bg-paper shadow-[0_24px_60px_rgba(20,24,21,0.25)] sm:inset-x-auto sm:bottom-7 sm:right-7 sm:h-155 sm:max-h-[80vh] sm:w-100 sm:rounded-[28px] sm:ring-1 sm:ring-black/5"
            >
              {/* Header */}
              <div className="relative shrink-0 overflow-hidden bg-[#1E2621] px-5 py-4">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.15]"
                  style={{
                    background:
                      'radial-gradient(120px 80px at 85% 0%, #C08A3E, transparent 70%)',
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                      <ProFormaAIIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#F6F6F2]">AI Assistant</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-[#B9C2BC]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Online now
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#B9C2BC] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close chat"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesRef}
                className="flex-1 space-y-3 overflow-y-auto bg-mist/40 px-4 pt-5"
              >
                {grouped.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 shrink-0">
                          {msg.isLastInGroup && <BotAvatar />}
                        </div>
                      )}

                      <div className={`flex max-w-[78%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-4 py-2.5 text-[14.5px] leading-6 shadow-sm ${
                            isUser
                              ? 'rounded-[18px] rounded-br-md bg-linear-to-br from-sage to-sage-dark text-white'
                              : 'rounded-[18px] rounded-bl-md border border-black/4 bg-white text-ink'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          ) : (
                            <div className="max-w-none text-[14.5px] leading-6 [&_a]:text-sage [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:text-[13px] [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-sm [&_pre]:text-white">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={assistantMarkdownComponents}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {msg.isLastInGroup && (
                          <span className="mt-1 px-1 text-[10.5px] text-slate-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 shrink-0">
                          {msg.isLastInGroup && (
                            <UserAvatar name={user?.name || ''} profilePic={user?.profile_pic} />
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-end justify-start gap-2"
                  >
                    <div className="w-7 shrink-0">
                      <BotAvatar />
                    </div>
                    <div className="rounded-[18px] rounded-bl-md border border-black/4 bg-white px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={bottomRef} className="h-1" />
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-black/5 bg-paper px-4 pb-4 pt-3">
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-sage/50 focus-within:ring-2 focus-within:ring-sage/15">
                  <textarea
                    ref={inputRef}
                    className="max-h-20 flex-1 overflow-hidden resize-none bg-transparent px-1 py-1.5 text-sm text-ink placeholder-slate-400 outline-none align-middle"
                    placeholder="Message the assistant…"
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading || !conversationReady}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !conversationReady || !inputText.trim()}
                    aria-label="Send message"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                      loading || !conversationReady || !inputText.trim()
                        ? 'bg-slate-100 text-slate-300'
                        : 'bg-sage text-white shadow-[0_2px_8px_rgba(47,122,77,0.3)] hover:scale-105 active:scale-95'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="pt-2.5 text-center text-[10.5px] text-slate-400">
                  AI-generated responses may contain mistakes
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
