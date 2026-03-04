"use client";

import SquarePen from "lucide-react/dist/esm/icons/square-pen";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Ellipsis from "lucide-react/dist/esm/icons/ellipsis";
import Link from "next/link";
import { useEffect, useState } from "react";
import GPTIcons from "./gpt-icon";
import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";

interface ChatSidebarProps {
  chatId?: string;
  collapsed: boolean;
  onToggle: () => void;
  onNewChat?: () => void;
  onChatDeleted?: (chatId: string) => void;
}

export const ChatSidebar = ({
  chatId,
  collapsed,
  onToggle,
  onNewChat,
  onChatDeleted,
}: ChatSidebarProps) => {
  const [chatList, setChatList] = useState<{ _id: string; title: string }[]>(
    []
  );
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { user } = useUser();
  const displayName = (() => {
    const candidate =
      user?.given_name || user?.nickname || user?.name || "Account";
    if (!candidate) return "Account";
    return candidate.includes("@") ? candidate.split("@")[0] : candidate;
  })();

  useEffect(() => {
    const loadChatList = async () => {
      try {
        const response = await fetch(`/api/chat/getChatList`);
        if (!response.ok) {
          setChatList([]);
          return;
        }
        const json = await response.json();
        setChatList(json?.chats || []);
      } catch {
        setChatList([]);
      }
    };
    loadChatList();
  }, [chatId]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-chat-row-menu='true']")) {
        return;
      }
      setOpenMenuChatId(null);
    };

    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!actionError) return;
    const timeout = setTimeout(() => setActionError(null), 3500);
    return () => clearTimeout(timeout);
  }, [actionError]);

  const saveTitle = async (chatItemId: string) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      setEditingChatId(null);
      return;
    }

    const response = await fetch("/api/chat/updateTitle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chatItemId, title: nextTitle }),
    });

    if (response.ok) {
      setChatList((prev) =>
        prev.map((item) =>
          item._id === chatItemId ? { ...item, title: nextTitle } : item
        )
      );
      setActionError(null);
    } else {
      setActionError("Could not rename this chat right now. Please try again.");
    }

    setEditingChatId(null);
  };

  const deleteChat = async (chatItemId: string) => {
    const response = await fetch("/api/chat/deleteChat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chatItemId }),
    });

    if (!response.ok) {
      setActionError("Could not delete this chat right now. Please try again.");
      return;
    }

    setChatList((prev) => prev.filter((item) => item._id !== chatItemId));
    onChatDeleted?.(chatItemId);
    setActionError(null);
  };

  return (
    <>
      <div
        className={`hidden sm:flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#171717] text-white ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {collapsed ? (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={onToggle}
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
                onClick={onNewChat}
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
                onClick={onToggle}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto mt-4 px-2">
              {actionError && (
                <div className="mb-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {actionError}
                </div>
              )}
              {chatList.map((chat) => (
                <div
                  key={chat._id}
                  className={`group relative ${
                    openMenuChatId === chat._id ? "z-30" : "z-0"
                  }`}
                >
                  <Link
                    href={`/chat/${chat._id}`}
                    className={`side-menu-item group !m-0 ${
                      chatId === chat._id
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    } pr-16`}
                    title={chat.title}
                    onClick={(event) => {
                      if (chatId === chat._id || editingChatId === chat._id) {
                        event.preventDefault();
                      }
                      setOpenMenuChatId(null);
                    }}
                  >
                    {editingChatId === chat._id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(event) =>
                          setEditingTitle(event.target.value)
                        }
                        onBlur={() => saveTitle(chat._id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveTitle(chat._id);
                          }
                          if (event.key === "Escape") {
                            setEditingChatId(null);
                          }
                        }}
                        className="w-full rounded bg-[#2a2a2a] px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                        {chat.title}
                      </span>
                    )}
                  </Link>
                  {editingChatId !== chat._id && (
                    <div
                      data-chat-row-menu="true"
                      className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center ${
                        openMenuChatId === chat._id
                          ? "opacity-100"
                          : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenMenuChatId((prev) =>
                            prev === chat._id ? null : chat._id
                          );
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                        title="Chat actions"
                      >
                        <Ellipsis className="h-4 w-4" />
                      </button>
                      {openMenuChatId === chat._id && (
                        <div
                          className="absolute right-0 top-7 z-50 w-40 rounded-xl border border-white/10 bg-[#2a2a2a] p-1 shadow-xl"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setEditingChatId(chat._id);
                              setEditingTitle(chat.title);
                              setOpenMenuChatId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
                            title="Rename chat"
                          >
                            <SquarePen className="h-4 w-4" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void deleteChat(chat._id);
                              setOpenMenuChatId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-300 hover:bg-white/10"
                            title="Delete chat"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3">
              <Link
                href="/auth/logout"
                title="logout"
                className="side-menu-item group rounded-xl border border-white/5 hover:!bg-white/10"
              >
                {user?.picture && (
                  <Image
                    src={user.picture}
                    width={32}
                    height={32}
                    priority={true}
                    alt="User avatar"
                    className="rounded-full shadow-lg border border-white/10"
                  />
                )}
                <span className="font-medium text-sm text-gray-200 group-hover:text-white">
                  {displayName}
                </span>
                <LogOut className="ml-auto h-5 w-5 text-gray-400 group-hover:text-white" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};
