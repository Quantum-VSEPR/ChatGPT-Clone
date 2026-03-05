"use client";

import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "components/ChatSidebar";
import { v4 as uuid } from "uuid";
import { Message } from "components/Message";
import { useRouter } from "next/navigation";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import Square from "lucide-react/dist/esm/icons/square";
import { motion } from "framer-motion";

interface ChatClientProps {
  chatId?: string;
  title?: string;
  initialMessages?: { _id: string; role: string; content: string }[];
}

export default function ChatClient({
  chatId,
  title,
  initialMessages = [],
}: ChatClientProps) {
  const handoffMessages =
    typeof window !== "undefined" && chatId
      ? (() => {
          const state = (window.history.state || {}) as {
            __chatHandoff?: {
              id?: string;
              messages?: { _id: string; role: string; content: string }[];
            };
          };

          const handoff = state.__chatHandoff;
          if (
            handoff?.id === chatId &&
            Array.isArray(handoff.messages) &&
            handoff.messages.length > 0
          ) {
            return handoff.messages;
          }

          return [] as { _id: string; role: string; content: string }[];
        })()
      : [];

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(chatId);
  const [incommingMessage, setIncommingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] =
    useState<{ _id: string; role: string; content: string }[]>(handoffMessages);
  const [suppressInitialMessages, setSuppressInitialMessages] = useState(
    handoffMessages.length > 0
  );
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const router = useRouter();
  const focusInput = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatIdRef = useRef<string | undefined>(chatId);
  const pendingRouteSyncChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentState = (window.history.state || {}) as {
      __chatHandoff?: unknown;
    };

    if (!currentState.__chatHandoff) return;

    const { __chatHandoff, ...rest } = currentState;
    void __chatHandoff;
    window.history.replaceState(rest, "", window.location.href);
  }, []);

  // Reset client messages when navigating to a different chat
  useEffect(() => {
    const currentActiveChatId = activeChatIdRef.current;
    if (chatId === currentActiveChatId) {
      return;
    }

    if (chatId && pendingRouteSyncChatIdRef.current === chatId) {
      pendingRouteSyncChatIdRef.current = null;
      return;
    }

    pendingRouteSyncChatIdRef.current = null;
    setSuppressInitialMessages(false);
    setActiveChatId(chatId);
    setNewChatMessages([]);
    setIncommingMessage("");
  }, [chatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [newChatMessages, incommingMessage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim() || generatingResponse) return;

    setGeneratingResponse(true);
    const requestChatId = activeChatIdRef.current;
    const isCreatingNewThread = !requestChatId;
    const currentMessage = messageText;
    const userMessage = { _id: uuid(), role: "user", content: currentMessage };

    setNewChatMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    try {
      setMessageText("");
      focusInput.current?.focus();
      const response = await fetch("/api/chat/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: requestChatId,
          message: currentMessage,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        throw new Error("Failed to send message");
      }

      const chatIdHeader = response.headers.get("Chat-Id");
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Missing response stream");
      }
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = new TextDecoder().decode(value);
        setIncommingMessage((prev) => `${prev}${chunkText}`);
        content += chunkText;
      }

      setIncommingMessage("");
      const assistantMessage = {
        _id: uuid(),
        role: "assistant",
        content,
      };
      setNewChatMessages((prev) => [...prev, assistantMessage]);
      focusInput.current?.focus();

      if (chatIdHeader) {
        setActiveChatId(chatIdHeader);
        activeChatIdRef.current = chatIdHeader;

        if (isCreatingNewThread) {
          pendingRouteSyncChatIdRef.current = chatIdHeader;
        }

        if (typeof window !== "undefined") {
          const nextPath = `/chat/${chatIdHeader}`;
          if (window.location.pathname !== nextPath) {
            const state = (window.history.state || {}) as {
              [key: string]: unknown;
            };
            const nextState = isCreatingNewThread
              ? {
                  ...state,
                  __chatHandoff: {
                    id: chatIdHeader,
                    messages: [userMessage, assistantMessage],
                  },
                }
              : state;

            window.history.replaceState(nextState, "", nextPath);
          }
        }
      }

      setGeneratingResponse(false);
    } catch (error) {
      console.error("Fetch error:", error);
      setGeneratingResponse(false);
    }
  };

  const handleNewChat = () => {
    pendingRouteSyncChatIdRef.current = null;
    setActiveChatId(undefined);
    activeChatIdRef.current = undefined;
    setNewChatMessages([]);
    setIncommingMessage("");
    setMessageText("");
    setSuppressInitialMessages(false);
    router.replace("/chat");
  };

  const allMessages = [
    ...(suppressInitialMessages ? [] : initialMessages),
    ...newChatMessages,
  ];

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100">
      <ChatSidebar
        chatId={activeChatId}
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        onNewChat={handleNewChat}
        onChatDeleted={(deletedId) => {
          if (deletedId === activeChatId) {
            setActiveChatId(undefined);
            activeChatIdRef.current = undefined;
            setNewChatMessages([]);
            setIncommingMessage("");
            setSuppressInitialMessages(false);
            router.replace("/chat");
          }
        }}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 w-full pb-36 sm:pb-32">
          <div className="mx-auto max-w-3xl flex flex-col pt-14 sm:pt-6">
            {allMessages.length === 0 && !incommingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6"
              >
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Search for an answer
                </h1>
                <p className="text-gray-400 text-sm max-w-md">
                  Ask anything to start your saved chat.
                </p>
              </motion.div>
            )}
            {allMessages.map((message) => (
              <Message
                key={message._id}
                role={message.role}
                content={message.content}
              />
            ))}
            {!!incommingMessage && (
              <Message role="assistant" content={incommingMessage} />
            )}
            {generatingResponse && !incommingMessage && (
              <div className="mb-6 flex w-full justify-start">
                <div className="w-full max-w-full pl-2 pt-2">
                  <div className="flex h-8 items-center">
                    <motion.div
                      className="flex items-center justify-center rounded-full bg-white p-1.5"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-black" />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input footer */}
        <footer className="absolute bottom-3 left-0 right-0 px-3 pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:px-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <fieldset className="relative flex items-end gap-2 rounded-[26px] bg-[#2f2f2f] px-4 py-[14px] w-full shadow-lg">
              <textarea
                ref={focusInput}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(
                    e.target.scrollHeight,
                    200
                  )}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                className="flex-1 resize-none bg-transparent text-white placeholder-gray-400 outline-none text-[16px] leading-relaxed max-h-[200px] overflow-y-auto"
                placeholder={
                  generatingResponse ? "Generating response..." : "Ask anything"
                }
              />
              {generatingResponse ? (
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-red-500/60 bg-red-600 p-1.5 text-white transition-colors"
                  title="Please wait for the response to finish"
                >
                  <Square className="h-3 w-3 fill-white" strokeWidth={3} />
                </button>
              ) : messageText.trim().length > 0 ? (
                <button
                  type="submit"
                  disabled={generatingResponse}
                  className="shrink-0 rounded-full bg-white p-1.5 text-black transition-colors hover:bg-gray-200"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
              ) : null}
            </fieldset>
            <p className="text-center text-xs text-[#8e8e8e] mt-3">
              AI can make mistakes. Consider checking important information.
            </p>
          </form>
        </footer>
      </div>
    </div>
  );
}
