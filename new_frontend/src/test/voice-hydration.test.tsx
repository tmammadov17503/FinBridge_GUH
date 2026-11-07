import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Chat } from "@/components/finbridge/Chat";

describe("mic button and server rendering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("leaves the mic out of the first render, then adds it in a browser that can record", async () => {
    vi.stubGlobal("MediaRecorder", class {});
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve() },
    });

    // The first client render has to match the server's HTML, even in a capable browser.
    expect(renderToString(<Chat userId="demo-amira" />)).not.toContain(
      "Ask by voice",
    );

    render(<Chat userId="demo-amira" />);

    expect(
      await screen.findByRole("button", { name: "Ask by voice" }),
    ).toBeInTheDocument();
  });
});
