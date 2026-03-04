import { describe, expect, it, vi } from "vitest";

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContentStream: vi.fn(),
      };
    }
  },
}));

import { POST } from "../../app/api/chat/guest/route";

describe("Guest chat route", () => {
  it("returns 400 for invalid messages payload", async () => {
    const request = new Request("http://localhost:3000/api/chat/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Please send at least one message.");
  });
});
