import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({}),
    }),
  }),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContentStream: vi.fn(),
      };
    }
  },
}));

import { POST as sendMessagePOST } from "../../app/api/chat/sendMessage/route";
import { PATCH as updateTitlePATCH } from "../../app/api/chat/updateTitle/route";
import { DELETE as deleteChatDELETE } from "../../app/api/chat/deleteChat/route";

describe("Authenticated chat API routes", () => {
  it("returns 401 for unauthenticated sendMessage", async () => {
    const request = new Request("http://localhost:3000/api/chat/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await sendMessagePOST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 for unauthenticated updateTitle", async () => {
    const request = new Request("http://localhost:3000/api/chat/updateTitle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: "1", title: "new title" }),
    });

    const response = await updateTitlePATCH(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 for unauthenticated deleteChat", async () => {
    const request = new Request("http://localhost:3000/api/chat/deleteChat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: "1" }),
    });

    const response = await deleteChatDELETE(request);
    expect(response.status).toBe(401);
  });
});
