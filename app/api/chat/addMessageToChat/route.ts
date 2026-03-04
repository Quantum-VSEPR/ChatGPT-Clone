import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import {
  addMessageBodySchema,
  getValidationMessage,
  jsonError,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return jsonError("message", "Please sign in to continue.", 401);
    }
    const { user } = session;

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(
        "message",
        "Invalid request body. Please send valid JSON.",
        400
      );
    }

    const parsedBody = addMessageBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "message",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }

    const { chatId, role, content } = parsedBody.data;

    const client = await clientPromise;
    const db = client.db("gpt-clone");
    const chat = await db.collection("gpt-chat").findOneAndUpdate(
      {
        _id: new ObjectId(chatId),
        userId: user.sub,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { messages: { role, content } } } as any,
      { returnDocument: "after" }
    );

    const updatedChat = chat?.value || chat;
    if (!updatedChat) {
      return jsonError("message", "Chat not found.", 404);
    }

    return NextResponse.json({
      chat: {
        ...updatedChat,
        _id: updatedChat?._id?.toString() || chatId,
      },
    });
  } catch (error) {
    console.error("Error in addMessageToChat:", error);
    return jsonError(
      "message",
      "We could not save your message right now. Please try again.",
      500
    );
  }
}
