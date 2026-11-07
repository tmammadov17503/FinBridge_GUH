import { describe, expect, it } from "vitest";

import {
  ChatBody,
  MAX_MESSAGE_CHARS,
  pickReply,
  pickSources,
  toChatResponse,
  unwrap,
} from "@/lib/finbridge/normalize";

describe("ChatBody validation", () => {
  it("accepts a normal question and trims it", () => {
    const parsed = ChatBody.parse({
      message: "  Will I run short before payday?  ",
      userId: "demo-amira",
    });

    expect(parsed.message).toBe("Will I run short before payday?");
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(
      ChatBody.safeParse({ message: "   ", userId: "demo-josh" }).success,
    ).toBe(false);
  });

  it("bounds the message length, so a huge paste cannot reach the agent", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_CHARS + 1);

    expect(
      ChatBody.safeParse({ message: tooLong, userId: "demo-josh" }).success,
    ).toBe(false);
  });

  it("rejects a userId that is not a plain slug", () => {
    for (const userId of ["../../etc/passwd", "demo amira", "demo;drop", ""]) {
      expect(ChatBody.safeParse({ message: "hello", userId }).success).toBe(
        false,
      );
    }
  });

  it("rejects an unknown channel", () => {
    expect(
      ChatBody.safeParse({ message: "hi", userId: "demo-josh", channel: "sms" })
        .success,
    ).toBe(false);
  });
});

describe("unwrap", () => {
  it("reads a bare object", () => {
    expect(unwrap({ reply: "hello" })).toEqual({ reply: "hello" });
  });

  it("reads the single-item array n8n returns by default", () => {
    expect(unwrap([{ reply: "hello" }])).toEqual({ reply: "hello" });
  });

  it("reads an n8n item wrapped in `json`", () => {
    expect(unwrap([{ json: { reply: "hello" } }])).toEqual({ reply: "hello" });
  });

  it("returns an empty object for junk rather than throwing", () => {
    for (const junk of [null, undefined, "text", 42, []]) {
      expect(unwrap(junk)).toEqual({});
    }
  });
});

describe("pickReply", () => {
  it("prefers `reply`, then falls back to the agent node's `output`", () => {
    expect(pickReply({ reply: "first", output: "second" })).toBe("first");
    expect(pickReply({ output: "second" })).toBe("second");
  });

  it("treats a blank string as no reply at all", () => {
    expect(pickReply({ reply: "   " })).toBeUndefined();
    expect(pickReply({})).toBeUndefined();
  });
});

describe("pickSources", () => {
  const good = {
    id: "manchester-unexpected-needs",
    title: "Unexpected Financial Needs Fund",
    provider: "University of Manchester",
    url: "https://www.studentsupport.manchester.ac.uk/finances/",
    caution: "Eligibility and any award are assessed by the university.",
  };

  it("keeps a well-formed catalogue entry and its caution", () => {
    const sources = pickSources([good]);

    expect(sources).toHaveLength(1);
    expect(sources?.[0]?.caution).toContain("assessed by the university");
  });

  it("drops entries with no URL or no title", () => {
    expect(
      pickSources([{ title: "No link" }, { url: "https://example.org" }]),
    ).toBeUndefined();
  });

  it("drops a non-http scheme, so a crafted entry cannot inject javascript:", () => {
    expect(
      pickSources([{ ...good, url: "javascript:alert(1)" }]),
    ).toBeUndefined();
  });

  it("returns undefined rather than an empty array when nothing survives", () => {
    expect(pickSources([])).toBeUndefined();
    expect(pickSources("not an array")).toBeUndefined();
  });
});

describe("toChatResponse", () => {
  const fallback = { userId: "demo-amira", sessionId: "s1" };

  it("normalises a full n8n payload", () => {
    const response = toChatResponse(
      [
        {
          json: {
            reply: "You have about nine days of buffer.",
            sessionId: "s-upstream",
            suggestedNextStep: "Check the hardship fund.",
            supportSources: [
              {
                id: "x",
                title: "A fund",
                provider: "A university",
                url: "https://example.ac.uk/fund",
                caution: "The provider decides.",
              },
            ],
          },
        },
      ],
      fallback,
    );

    expect(response?.reply).toBe("You have about nine days of buffer.");
    // The upstream session wins, so n8n's memory node keeps the thread.
    expect(response?.sessionId).toBe("s-upstream");
    expect(response?.supportSources).toHaveLength(1);
  });

  it("falls back to the request's ids when the agent omits them", () => {
    const response = toChatResponse({ reply: "Hello." }, fallback);

    expect(response?.sessionId).toBe("s1");
    expect(response?.userId).toBe("demo-amira");
  });

  it("returns undefined when there is no reply, so the route can error instead", () => {
    expect(toChatResponse({ somethingElse: true }, fallback)).toBeUndefined();
    expect(toChatResponse(null, fallback)).toBeUndefined();
  });
});
