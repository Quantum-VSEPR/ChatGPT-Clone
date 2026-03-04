import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { jsonError } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return jsonError("message", "Please sign in to continue.", 401);
    }
    const { user } = session;
    const client = await clientPromise;
    const db = client.db("gpt-clone");
    const chats = await db
      .collection("gpt-chat")
      .find(
        { userId: user.sub },
        {
          projection: {
            userId: 0,
            messages: 0,
          },
        }
      )
      .sort({ _id: -1 })
      .toArray();

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Error in getChatList:", error);
    return jsonError(
      "message",
      "We could not load your chats right now. Please try again.",
      500
    );
  }
}
