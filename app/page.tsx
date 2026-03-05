"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import SquarePen from "lucide-react/dist/esm/icons/square-pen";
import Square from "lucide-react/dist/esm/icons/square";
import { motion } from "framer-motion";
import { useUser } from "@auth0/nextjs-auth0/client";
import GPTIcons from "components/ChatSidebar/gpt-icon";
import { Message } from "components/Message";

type ChatMessage = {
  _id: string;
  role: string;
  content: string;
};

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [incommingMessage, setIncommingMessage] = useState("");
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [freeRequestsLeft, setFreeRequestsLeft] = useState(10);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const focusInput = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/chat");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const savedCount = localStorage.getItem("free_requests");
    if (savedCount !== null) {
      setFreeRequestsLeft(parseInt(savedCount, 10));
    }
  }, []);

  const updateRequestsLeft = () => {
    const newCount = freeRequestsLeft - 1;
    setFreeRequestsLeft(newCount);
    localStorage.setItem("free_requests", newCount.toString());
    if (newCount <= 0) {
      setShowLimitReached(true);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, incommingMessage]);

  const resetGuestChat = () => {
    setMessages([]);
    setIncommingMessage("");
    setMessageText("");
    setGeneratingResponse(false);
    setShowLimitReached(false);
    focusInput.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || generatingResponse) return;

    if (freeRequestsLeft <= 0) {
      setShowLimitReached(true);
      return;
    }

    setGeneratingResponse(true);
    const currentMessage = messageText;
    const userMessage = {
      _id: crypto.randomUUID(),
      role: "user",
      content: currentMessage,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      setMessageText("");
      focusInput.current?.focus();
      const response = await fetch("/api/chat/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate response");
      }

      const reader = response.body!.getReader();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = new TextDecoder().decode(value);
        setIncommingMessage((prev) => `${prev}${chunkText}`);
        content += chunkText;
      }

      setIncommingMessage("");
      setMessages([
        ...newMessages,
        { _id: crypto.randomUUID(), role: "assistant", content },
      ]);
      setGeneratingResponse(false);
      updateRequestsLeft();
      focusInput.current?.focus();
    } catch (error) {
      console.error("Fetch error:", error);
      setGeneratingResponse(false);
    }
  };

  if (isLoading || user) {
    return <div className="h-screen w-full bg-[#212121]" />;
  }

  return (
    <div className="flex h-screen w-full bg-[#212121] text-gray-100 overflow-hidden">
      <div
        className={`hidden sm:flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#171717] text-white ${
          isSidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {isSidebarCollapsed ? (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
              title="Expand sidebar"
            >
              <GPTIcons />
              <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-[#2a2a2a] group-hover:flex">
                <PanelLeftOpen className="h-4 w-4 text-white" />
              </span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 pt-3">
              <button
                type="button"
                onClick={resetGuestChat}
                className="side-menu-item !m-0 flex-1 text-sm hover:!bg-white/10"
                title="New chat"
              >
                <GPTIcons />
                <span className="truncate whitespace-nowrap font-medium tracking-wide">
                  New chat
                </span>
                <SquarePen className="ml-auto h-4 w-4 text-gray-300" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1" />
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white">
                Get responses tailored to you
              </h3>
              <p className="mt-1 text-[13px] text-gray-400 leading-snug">
                Log in to get answers based on saved chats.
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href="/auth/login"
                  className="flex-1 rounded-full border border-[#444] px-4 py-2 text-center text-[14px] font-semibold text-gray-100 hover:bg-[#2f2f2f]"
                >
                  Log in
                </a>
                <a
                  href="/auth/login?screen_hint=signup"
                  className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-gray-900 hover:bg-gray-200"
                >
                  Sign up
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="sm:hidden border-b border-white/10 bg-[#171717] px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetGuestChat}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-200"
              title="New chat"
            >
              New chat
            </button>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="/auth/login"
                className="rounded-full border border-[#444] px-3 py-1.5 text-xs font-semibold text-gray-100"
              >
                Log in
              </a>
              <a
                href="/auth/login?screen_hint=signup"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-900"
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 w-full pb-32">
          <div className="mx-auto max-w-3xl flex flex-col pt-4 sm:pt-6 pb-8">
            {messages.length === 0 && !incommingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6"
              >
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Search for an answer
                </h1>
              </motion.div>
            )}

            {messages.map((message) => (
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

        <footer className="absolute bottom-3 left-0 right-0 px-3 pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:px-4">
          <div className="mx-auto max-w-3xl">
            {showLimitReached ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center shadow-lg w-full">
                <h3 className="text-lg font-semibold text-rose-400">
                  Free Tier Limit Reached
                </h3>
                <p className="mt-2 text-[14px] text-gray-300">
                  You&apos;ve used all 10 free requests. Please sign in or create
                  an account to continue chatting without limits and save your
                  history.
                </p>
                <div className="mt-5 flex gap-4">
                  <a
                    href="/auth/login"
                    className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    Log in
                  </a>
                  <a
                    href="/auth/login?screen_hint=signup"
                    className="rounded-full border border-gray-600 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-gray-700 transition-colors"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="w-full">
                  <fieldset className="relative flex items-end gap-2 rounded-[26px] bg-[#2f2f2f] px-4 py-[14px] w-full shadow-lg">
                    <textarea
                      ref={focusInput}
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
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
                        generatingResponse
                          ? "Generating response..."
                          : "Ask anything"
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
                </form>
                <p className="mt-3 text-center text-[12px] text-[#8e8e8e]">
                  ChatGPT can make mistakes. Check important info.
                </p>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
