import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Chat } from "@/components/finbridge/Chat";

/**
 * jsdom has no MediaRecorder and no getUserMedia, so these tests also pin down the
 * degraded path: a browser that cannot record must still be fully usable by typing.
 */

function mockApi(reply: unknown) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/chat")) {
        return new Response(JSON.stringify(reply), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      // No test here should reach the voice endpoints.
      return new Response("{}", { status: 500 });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("<Chat>", () => {
  it("greets the user and offers starter questions", () => {
    mockApi({ reply: "unused" });
    render(<Chat userId="demo-amira" />);

    expect(screen.getByText(/I'm FinBridge/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Will I run short before my next payday\?/i,
      }),
    ).toBeInTheDocument();
  });

  it("hides the mic when the browser cannot record, leaving typing available", () => {
    mockApi({ reply: "unused" });
    render(<Chat userId="demo-amira" />);

    expect(
      screen.queryByRole("button", { name: /ask by voice/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();
  });

  it("sends a typed question and shows the reply", async () => {
    mockApi({ reply: "You have about nine days of buffer." });
    render(<Chat userId="demo-amira" />);

    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "Will I run short?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send your question/i }),
    );

    expect(
      await screen.findByText("You have about nine days of buffer."),
    ).toBeInTheDocument();
    expect(screen.getByText("Will I run short?")).toBeInTheDocument();
  });

  it("renders catalogue source cards with their caution and an external link", async () => {
    mockApi({
      reply: "Here is something to look at.",
      supportSources: [
        {
          id: "manchester-su-advice",
          title: "Students' Union Advice Service",
          provider: "University of Manchester Students' Union",
          url: "https://manchesterstudentsunion.com/advice",
          caution: "Check directly with the Advice Service.",
        },
      ],
    });
    render(<Chat userId="demo-josh" />);

    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "what support is there?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send your question/i }),
    );

    const link = await screen.findByRole("link", {
      name: /Students' Union Advice Service/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://manchesterstudentsunion.com/advice",
    );
    // Opening in a new tab must not hand the provider's page a window reference.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(
      screen.getByText(/Check directly with the Advice Service/i),
    ).toBeInTheDocument();
  });

  it("shows a dismissible banner when the agent cannot answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "Could not reach FinBridge." }),
            {
              status: 504,
              headers: { "content-type": "application/json" },
            },
          ),
      ),
    );
    render(<Chat userId="demo-amira" />);

    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "hello" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send your question/i }),
    );

    const banner = await screen.findByRole("status");
    expect(banner).toHaveTextContent(/Could not reach FinBridge/i);

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss this message/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });

  it("asks the question behind a starter chip, then hides the chips", async () => {
    const fetchMock = mockApi({ reply: "Here's your outlook." });
    render(<Chat userId="demo-amira" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Will I run short before my next payday\?/i,
      }),
    );

    await screen.findByText("Here's your outlook.");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      message: string;
      channel: string;
    };
    expect(body.message).toBe("Will I run short before my next payday?");
    expect(body.channel).toBe("web");
    expect(
      screen.queryByRole("button", {
        name: /What support could I apply for right now\?/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("sends a question handed in from the topic panel exactly once", async () => {
    const fetchMock = mockApi({ reply: "Answering the topic question." });
    render(
      <Chat
        userId="demo-amira"
        seed={{ text: "Are there grants?", nonce: 1 }}
      />,
    );

    await screen.findByText("Answering the topic question.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Are there grants?")).toBeInTheDocument();
  });

  it("starts a new conversation when New chat is pressed", async () => {
    mockApi({ reply: "First answer." });
    render(<Chat userId="demo-amira" />);

    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "first" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send your question/i }),
    );
    await screen.findByText("First answer.");

    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));

    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
    expect(screen.getByText(/I'm FinBridge/i)).toBeInTheDocument();
  });
});
