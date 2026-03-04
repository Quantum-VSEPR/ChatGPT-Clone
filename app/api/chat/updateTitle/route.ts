import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import {
  getValidationMessage,
  jsonError,
  normalizeTitle,
  updateTitleBodySchema,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
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

    const parsedBody = updateTitleBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "message",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }
    const { chatId, title } = parsedBody.data;

    const safeTitle = normalizeTitle(title);

    const client = await clientPromise;
    const db = client.db("gpt-clone");

    const result = await db.collection("gpt-chat").updateOne(
      { _id: new ObjectId(chatId), userId: session.user.sub },
      { $set: { title: safeTitle } }
    );

    if (!result.matchedCount) {
      return jsonError("message", "Chat not found.", 404);
    }

    return NextResponse.json({ ok: true, title: safeTitle });
  } catch (error) {
    console.error("Error in updateTitle:", error);
    return jsonError(
      "message",
      "We could not update the title right now. Please try again.",
      500
    );
  }
}
