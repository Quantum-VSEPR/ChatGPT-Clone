import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import {
  createChatBodySchema,
  getValidationMessage,
  jsonError,
  normalizeTitle,
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

    const parsedBody = createChatBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "message",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }

    const { message } = parsedBody.data;
    const safeTitle = normalizeTitle(message);

    const newUserMessage = {
      role: "user",
      content: message,
    };

    const client = await clientPromise;
    const db = client.db("gpt-clone");
    const chat = await db.collection("gpt-chat").insertOne({
      userId: user.sub,
      messages: [newUserMessage],
      title: safeTitle,
    });

    return NextResponse.json({
      _id: chat.insertedId.toString(),
      messages: [newUserMessage],
      title: safeTitle,
    });
  } catch (err) {
    console.error("error creating chat", err);
    return jsonError(
      "message",
      "We could not create your chat right now. Please try again.",
      500
    );
  }
}
