import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFinBridgeChat } from "@/hooks/useFinBridgeChat";
import type { Channel } from "@/lib/finbridge/types";

/** Stub `/api/chat` with a fixed JSON reply at a given status. */
function mockChat(body: unknown, { status = 200 }: { status?: number } = {}) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type FetchMock = ReturnType<typeof mockChat>;

/** The JSON body of the nth /api/chat call. */
function sentBody(fetchMock: FetchMock, index: number): Record<string, string> {
  const init = fetchMock.mock.calls[index]?.[1];
  return JSON.parse(String(init?.body)) as Record<string, string>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useFinBridgeChat", () => {
  it("opens with a greeting and nothing pending", () => {
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.author).toBe("agent");
    expect(result.current.pending).toBe(false);
  });

  it("adds the question and then the reply to one transcript", async () => {
    mockChat({ reply: "You have about nine days of buffer." });
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("Will I run short?");
    });

    const [, question, answer] = result.current.messages;
    expect(question?.author).toBe("user");
    expect(question?.text).toBe("Will I run short?");
    expect(answer?.author).toBe("agent");
    expect(answer?.text).toBe("You have about nine days of buffer.");
  });

  it("sends the userId and a stable sessionId so the agent keeps the thread", async () => {
    const fetchMock = mockChat({ reply: "ok" });
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-josh" }),
    );

    await act(async () => {
      await result.current.send("one");
    });
    await act(async () => {
      await result.current.send("two");
    });

    const bodies = fetchMock.mock.calls.map((_call, index) =>
      sentBody(fetchMock, index),
    );
    expect(bodies[0]?.["userId"]).toBe("demo-josh");
    expect(bodies[0]?.["sessionId"]).toBeTruthy();
    expect(bodies[1]?.["sessionId"]).toBe(bodies[0]?.["sessionId"]);
  });

  it("marks a spoken question and asks the agent for a voice-length answer", async () => {
    const fetchMock = mockChat({ reply: "Short spoken answer." });
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("spoken", { viaVoice: true, channel: "voice" });
    });

    const body = sentBody(fetchMock, 0) as unknown as { channel: Channel };
    expect(body.channel).toBe("voice");
    expect(result.current.messages[1]?.viaVoice).toBe(true);
  });

  it("surfaces a server error as a failed turn rather than silence", async () => {
    mockChat(
      { error: "The FinBridge chat workflow is not active in n8n." },
      { status: 502 },
    );
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("hello");
    });

    await waitFor(() =>
      expect(result.current.error).toContain("not active in n8n"),
    );
    expect(result.current.messages.at(-1)?.failed).toBe(true);
  });

  it("reports a network failure instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("hello");
    });

    expect(result.current.error).toContain("Lost connection");
    expect(result.current.messages.at(-1)?.failed).toBe(true);
  });

  it("ignores an empty message", async () => {
    const fetchMock = mockChat({ reply: "unused" });
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("   ");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1);
  });

  it("attaches catalogue sources to the agent turn", async () => {
    mockChat({
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
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-josh" }),
    );

    await act(async () => {
      await result.current.send("what support is there?");
    });

    expect(result.current.messages.at(-1)?.sources?.[0]?.title).toBe(
      "Students' Union Advice Service",
    );
  });

  it("clears the transcript and starts a new session on reset", async () => {
    const fetchMock = mockChat({ reply: "ok" });
    const { result } = renderHook(() =>
      useFinBridgeChat({ userId: "demo-amira" }),
    );

    await act(async () => {
      await result.current.send("first");
    });
    const firstSession = sentBody(fetchMock, 0);

    act(() => result.current.reset());
    await act(async () => {
      await result.current.send("second");
    });

    const secondSession = sentBody(fetchMock, 1);
    expect(secondSession["sessionId"]).not.toBe(firstSession["sessionId"]);
    expect(result.current.messages).toHaveLength(3);
  });
});
