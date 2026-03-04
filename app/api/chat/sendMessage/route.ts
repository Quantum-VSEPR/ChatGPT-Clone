import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import { consumeDailyRequestLimit } from "@/lib/api/rateLimit";
import {
  getGeminiApiKey,
  getValidationMessage,
  jsonError,
  normalizeTitle,
  sendMessageBodySchema,
} from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const fallbackTitleFromMessage = (message: string) => {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 50 ? `${cleaned.slice(0, 47)}...` : cleaned;
};

const generateConciseTitle = async (
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  userMessage: string,
  assistantMessage: string
) => {
  const prompt = `Generate a concise chat title (max 6 words) for this conversation. Return only the title, no punctuation at the end.
User: ${userMessage}
Assistant: ${assistantMessage}`;

  try {
    const titleResult = await model.generateContent(prompt);
    const titleText = titleResult.response.text() || "";
    return normalizeTitle(titleText);
  } catch {
    return fallbackTitleFromMessage(userMessage);
  }
};

export async function POST(req: Request) {
  let newChatId: string | undefined;

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

    const parsedBody = sendMessageBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError(
        "message",
        getValidationMessage(parsedBody.error.issues),
        400
      );
    }

    const message = parsedBody.data.message;
    let chatId = parsedBody.data.chatId;
    if (chatId && !ObjectId.isValid(chatId)) {
      return jsonError(
        "message",
        "Invalid chat ID. Please refresh and try again.",
        400
      );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured for sendMessage route.");
      return jsonError(
        "message",
        "Chat service is temporarily unavailable. Please try again shortly.",
        500
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    let chatMessages: Array<{ role: string; content: string }> = [];

    const client = await clientPromise;
    const db = client.db("gpt-clone");

    const dailyLimitResult = await consumeDailyRequestLimit(db, user.sub, 30);
    if (!dailyLimitResult.allowed) {
      const rateLimitHeaders = new Headers();
      rateLimitHeaders.set("X-RateLimit-Limit", String(dailyLimitResult.limit));
      rateLimitHeaders.set("X-RateLimit-Remaining", String(dailyLimitResult.remaining));
      rateLimitHeaders.set("Retry-After", String(dailyLimitResult.retryAfterSeconds));

      return jsonError(
        "message",
        "You have reached your daily limit of 30 messages. Please try again tomorrow.",
        429,
        rateLimitHeaders
      );
    }

    const newUserMessage = {
      _id: new ObjectId(),
      role: "user",
      content: message,
    };

    if (chatId) {
      // Add message to existing chat directly
      const chat = await db.collection("gpt-chat").findOneAndUpdate(
        {
          _id: new ObjectId(chatId),
          userId: user.sub,
        },
        { $push: { messages: newUserMessage } } as any,
        { returnDocument: "after" }
      );
      
      if (!chat) {
        return jsonError("message", "Chat not found.", 404);
      }
      chatMessages = chat.value?.messages || chat?.messages || []; 
      // note: findOneAndUpdate returns an object with `value` or might be the doc itself in newer mongodb 6.0+
      if (!chatMessages.length && chat.value) { chatMessages = chat.value.messages; }
      else if (!chatMessages.length && chat.messages) { chatMessages = chat.messages; }
      
    } else {
      // Create new chat directly
      const chat = await db.collection("gpt-chat").insertOne({
        userId: user.sub,
        messages: [newUserMessage],
        title: message,
      });
      chatId = chat.insertedId.toString();
      newChatId = chatId;
      chatMessages = [newUserMessage];
    }

    // Default message array just in case
    if (!chatMessages || chatMessages.length === 0) {
      chatMessages = [{ role: "user", content: message }];
    }

    const messagesToInclude: Array<{
      role: "user" | "model";
      parts: [{ text: string }];
    }> = [];
    const reversedMessages = [...chatMessages].reverse();
    let usedTokens = 0;
    
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

    // Gemini API strict rule: Must start with a user message, roles must alternate!
    const sanitizedContents: Array<{
      role: "user" | "model";
      parts: [{ text: string }];
    }> = [];
    let lastRole: "user" | "model" | null = null;
    for (const msg of messagesToInclude) {
        if (msg.role === lastRole) {
            sanitizedContents[sanitizedContents.length - 1].parts[0].text += "\n" + msg.parts[0].text;
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
        "message",
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
        let fullContent = "";
        try {
          for await (const chunk of aiStream.stream) {
            const streamedData = chunk.text() || "";
            if (streamedData !== "") {
              controller.enqueue(encoder.encode(streamedData));
              fullContent += streamedData;
            }
          }

          // Persist assistant reply once streaming is done directly to MongoDB!
          if (chatId) {
            await db.collection("gpt-chat").updateOne(
              { _id: new ObjectId(chatId), userId: user.sub },
              { $push: { messages: { _id: new ObjectId(), role: "assistant", content: fullContent } } } as any
            );

            if (newChatId && fullContent.trim()) {
              const generatedTitle = await generateConciseTitle(
                model,
                message,
                fullContent
              );

              await db.collection("gpt-chat").updateOne(
                { _id: new ObjectId(chatId), userId: user.sub },
                { $set: { title: generatedTitle } }
              );
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", "text/plain");
    if (newChatId) headers.set("Chat-Id", newChatId);

    return new Response(readableStream, { headers });
  } catch (error) {
    console.error("Error in sendMessage handler:", error);
    
    // Ensure the frontend still redirects to the newly created chat even if the AI fails!
    const errHeaders = new Headers();
    if (newChatId) errHeaders.set("Chat-Id", newChatId);
    
    return NextResponse.json(
      {
        error: "We could not send your message right now. Please try again.",
      },
      { status: 500, headers: errHeaders }
    );
  }
}
