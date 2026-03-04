import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_TITLE_LENGTH = 60;

export const messageContentSchema = z
  .string({ error: "Message must be text." })
  .trim()
  .min(1, "Message cannot be empty.")
  .max(
    MAX_MESSAGE_LENGTH,
    `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
  );

export const titleSchema = z
  .string({ error: "Title must be text." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(
    MAX_TITLE_LENGTH,
    `Title is too long. Please keep it under ${MAX_TITLE_LENGTH} characters.`
  );

export const chatIdSchema = z
  .string({ error: "chatId must be a string." })
  .trim()
  .min(1, "chatId is required.")
  .refine((value) => ObjectId.isValid(value), {
    message: "Invalid chat ID.",
  });

export const roleSchema = z.enum(["user", "assistant", "model"], {
  error: "Invalid role.",
});

const guestMessageSchema = z.object({
  role: roleSchema,
  content: messageContentSchema,
});

export const guestMessagesBodySchema = z.object({
  messages: z
    .array(guestMessageSchema)
    .min(1, "Please send at least one message.")
    .max(100, "Too many messages in one request."),
});

export const sendMessageBodySchema = z.object({
  message: messageContentSchema,
  chatId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const createChatBodySchema = z.object({
  message: messageContentSchema,
});

export const addMessageBodySchema = z.object({
  chatId: chatIdSchema,
  role: roleSchema,
  content: messageContentSchema,
});

export const deleteChatBodySchema = z.object({
  chatId: chatIdSchema,
});

export const updateTitleBodySchema = z.object({
  chatId: chatIdSchema,
  title: titleSchema,
});

export const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey && apiKey.length > 0 ? apiKey : null;
};

export const getValidationMessage = (issues: z.ZodIssue[]) => {
  if (!issues.length) return "Invalid request data.";
  return issues[0]?.message || "Invalid request data.";
};

export const jsonError = (
  key: "message" | "error",
  message: string,
  status: number,
  headers?: Headers
) => {
  return NextResponse.json({ [key]: message }, { status, headers });
};

export const normalizeTitle = (input: string) => {
  const cleaned = input.replace(/["'`]/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > MAX_TITLE_LENGTH
    ? `${cleaned.slice(0, MAX_TITLE_LENGTH - 3)}...`
    : cleaned;
};
