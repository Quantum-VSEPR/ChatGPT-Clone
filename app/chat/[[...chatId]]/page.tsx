import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ chatId?: string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { chatId } = await params;
  const id = chatId?.[0];
  return {
    title: id ? `Chat – GPT Clone` : "New Chat – GPT Clone",
  };
}

export default async function ChatPage({ params }: PageProps) {
  const session = await auth0.getSession();

  if (!session || !session.user) {
    redirect("/");
  }

  const { user } = session;
  const { chatId } = await params;
  const id = chatId?.[0] ?? null;

  let title: string | undefined;
  let messages: { _id: string; role: string; content: string }[] = [];

  if (id) {
    try {
      const client = await clientPromise;
      const db = client.db("gpt-clone");
      const chat = await db.collection("gpt-chat").findOne({
        userId: user.sub,
        _id: new ObjectId(id),
      });

      if (!chat) {
        redirect("/chat");
      }

      title = chat.title;
      messages =
        chat.messages?.map(
          (
            msg: { _id?: unknown; role: string; content: string },
            index: number
          ) => ({
            ...msg,
            _id:
              typeof msg._id === "string"
                ? msg._id
                : (msg._id as { toString?: () => string })?.toString?.() ||
                  `${id || "chat"}-${index}`,
          })
        ) || [];
    } catch {
      redirect("/chat");
    }
  }

  return (
    <ChatClient
      chatId={id ?? undefined}
      title={title}
      initialMessages={messages}
    />
  );
}
