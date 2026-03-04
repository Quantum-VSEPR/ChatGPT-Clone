import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  getGeminiApiKey,
  getValidationMessage,
  guestMessagesBodySchema,
  jsonError,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError(
        "error",
        "Invalid request body. Please send valid JSON.",
        400
      );
    }

    const parsedBody = guestMessagesBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "error",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }

    const { messages } = parsedBody.data;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured for guest route.");
      return jsonError(
        "error",
        "Chat service is temporarily unavailable. Please try again shortly.",
        500
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const messagesToInclude: Array<{
      role: "user" | "model";
      parts: [{ text: string }];
    }> = [];
    let usedTokens = 0;

    const reversedMessages = [...messages].reverse();
    for (const chatMessage of reversedMessages) {
      const text = chatMessage.content || "";
      const messageTokens = text.length / 4;
      usedTokens += messageTokens;
      if (usedTokens <= 8000) {
        messagesToInclude.push({
          role: chatMessage.role === "assistant" || chatMessage.role === "model" ? "model" : "user",
          parts: [{ text: text }],
        });
      } else {
        break;
      }
    }
    messagesToInclude.reverse();

    const sanitizedContents: Array<{
      role: "user" | "model";
      parts: [{ text: string }];
    }> = [];
    let lastRole: "user" | "model" | null = null;
    for (const msg of messagesToInclude) {
      if (msg.role === lastRole) {
        sanitizedContents[sanitizedContents.length - 1].parts[0].text +=
          "\n" + msg.parts[0].text;
      } else {
        sanitizedContents.push(msg);
        lastRole = msg.role;
      }
    }

    if (sanitizedContents.length > 0 && sanitizedContents[0].role === "model") {
      sanitizedContents.shift();
    }

    if (sanitizedContents.length === 0) {
      return jsonError(
        "error",
        "Please provide at least one valid user message.",
        400
      );
    }

    const aiStream = await model.generateContentStream({
      contents: sanitizedContents,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of aiStream.stream) {
            const streamedData = chunk.text() || "";
            if (streamedData !== "") {
              controller.enqueue(encoder.encode(streamedData));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Guest chat error:", error);
    return jsonError(
      "error",
      "We could not process your request right now. Please try again.",
      500
    );
  }
}
