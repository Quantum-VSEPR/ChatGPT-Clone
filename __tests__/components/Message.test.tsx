import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Message } from "../../components/Message";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }: any) => {
      void initial;
      void animate;
      void transition;
      return <div {...props}>{children}</div>;
    },
  },
}));

describe("Message Component", () => {
  it("renders user message correctly", () => {
    render(<Message role="user" content="Hello ChatGPT" />);

    expect(screen.getByText("Hello ChatGPT")).toBeInTheDocument();
  });

  it("renders assistant message and copy action", () => {
    render(<Message role="assistant" content="Hello User" />);

    expect(screen.getByText("Hello User")).toBeInTheDocument();
    expect(screen.getByTitle("Copy response")).toBeInTheDocument();
  });
});
