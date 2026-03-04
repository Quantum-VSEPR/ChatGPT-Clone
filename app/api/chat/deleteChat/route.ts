import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import {
  deleteChatBodySchema,
  getValidationMessage,
  jsonError,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return jsonError("message", "Please sign in to continue.", 401);
    }

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

    const parsedBody = deleteChatBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "message",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }
    const { chatId } = parsedBody.data;

    const client = await clientPromise;
    const db = client.db("gpt-clone");

    const result = await db.collection("gpt-chat").deleteOne({
      _id: new ObjectId(chatId),
      userId: session.user.sub,
    });

    if (!result.deletedCount) {
      return jsonError("message", "Chat not found.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in deleteChat:", error);
    return jsonError(
      "message",
      "We could not delete this chat right now. Please try again.",
      500
    );
  }
}
