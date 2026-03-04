import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "../../app/page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@auth0/nextjs-auth0/client", () => ({
  useUser: () => ({
    user: null,
    isLoading: false,
  }),
}));

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

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

describe("Public Home Page", () => {
  it("removes explore section and legacy marketing phrase", () => {
    render(<Home />);

    expect(screen.queryByText("Explore GPTs")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/plus create images and upload files/i)
    ).not.toBeInTheDocument();
  });

  it("collapses and expands sidebar without auth redirect control", () => {
    render(<Home />);

    const collapseButton = screen.getByTitle("Collapse sidebar");
    fireEvent.click(collapseButton);

    expect(screen.getByTitle("Expand sidebar")).toBeInTheDocument();
  });

  it("does not render search icon button in input", () => {
    render(<Home />);

    expect(screen.queryByTitle("Search")).not.toBeInTheDocument();
  });
});
