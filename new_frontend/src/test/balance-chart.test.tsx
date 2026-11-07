import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { BalanceChart } from "@/components/finbridge/BalanceChart";
import { Chat } from "@/components/finbridge/Chat";
import { HeaderCards } from "@/components/finbridge/HeaderCards";
import { pickForecast, toChatResponse } from "@/lib/finbridge/normalize";
import type { BalanceForecast } from "@/lib/finbridge/types";

const base = [
  { date: "2026-11-27", balance: -60 },
  { date: "2026-11-28", balance: -80.5 },
];
const changed = [
  { date: "2026-11-27", balance: -110 },
  { date: "2026-11-28", balance: -130 },
];

const forecast: BalanceForecast = {
  hasShortfall: true,
  firstShortfallDate: "2026-11-27",
  firstShortfallAmount: -60,
  dailySeries: base,
  scenarios: {
    base: { dailySeries: base },
    changed: { dailySeries: changed },
  },
};

const cell = (name: string) => screen.getByRole("cell", { hidden: true, name });

function sendQuestion() {
  fireEvent.change(screen.getByLabelText("Your question"), {
    target: { value: "Can I cover rent?" },
  });
  fireEvent.click(screen.getByRole("button", { name: /send your question/i }));
}

beforeAll(() => {
  // jsdom has no ResizeObserver, which the chart's container needs.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BalanceChart", () => {
  it("shows both scenarios", () => {
    render(<BalanceChart forecast={forecast} />);

    expect(screen.getAllByText("Current plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("If you lose shifts").length).toBeGreaterThan(0);
    expect(cell("-£60")).toBeInTheDocument();
    expect(cell("-£80.50")).toBeInTheDocument();
    expect(cell("-£110")).toBeInTheDocument();
    expect(cell("-£130")).toBeInTheDocument();
  });

  it("falls back to one line when the request had no second scenario", () => {
    render(<BalanceChart forecast={{ ...forecast, scenarios: undefined }} />);

    expect(cell("-£60")).toBeInTheDocument();
    expect(screen.queryByText("If you lose shifts")).not.toBeInTheDocument();
  });

  it("renders nothing when the workflow sends no daily series", () => {
    const { container } = render(
      <BalanceChart forecast={{ hasShortfall: true }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("HeaderCards", () => {
  it("shows the first shortfall's depth as a positive amount", () => {
    render(<HeaderCards forecast={forecast} />);

    expect(screen.getByText(/^£60 short on 27 Nov/)).toBeInTheDocument();
    expect(screen.queryByText("Nothing here yet.")).not.toBeInTheDocument();
  });

  it("says so when there is no shortfall", () => {
    render(<HeaderCards forecast={{ hasShortfall: false }} />);

    expect(screen.getByText(/^No shortfall/)).toBeInTheDocument();
  });

  it("doesn't claim there is no shortfall when the amount is missing", () => {
    render(
      <HeaderCards
        forecast={{ hasShortfall: true, firstShortfallDate: "2026-11-27" }}
      />,
    );

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByText(/^No shortfall/)).not.toBeInTheDocument();
  });
});

describe("forecast normalisation", () => {
  it("keeps the chart fields through the chat response", () => {
    const response = toChatResponse(
      { explanation: "An answer.", forecast },
      { userId: "demo-josh" },
    );

    expect(response?.forecast).toEqual(forecast);
  });

  it("drops malformed points and an incomplete pair of scenarios", () => {
    const picked = pickForecast({
      firstShortfallAmount: "a lot",
      dailySeries: [
        { date: "2026-11-27", balance: -60 },
        { date: "2026-11-28", balance: "oops" },
        null,
      ],
      scenarios: { base: { dailySeries: base } },
    });

    expect(picked?.firstShortfallAmount).toBeUndefined();
    expect(picked?.dailySeries).toEqual([{ date: "2026-11-27", balance: -60 }]);
    expect(picked?.scenarios).toBeUndefined();
  });

  it("copes with a response that has no forecast", () => {
    expect(pickForecast(undefined)).toBeUndefined();
    expect(
      toChatResponse({ reply: "Hi." }, { userId: "demo-josh" })?.forecast,
    ).toBeUndefined();
  });
});

describe("Chat", () => {
  function stubReply() {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ reply: "An answer.", forecast }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
  }

  it("passes each new forecast up to the page and draws the chart", async () => {
    stubReply();
    const onForecast = vi.fn();

    render(<Chat userId="demo-josh" onForecast={onForecast} />);
    sendQuestion();

    await waitFor(() => expect(onForecast).toHaveBeenCalledWith(forecast));
    expect(
      await screen.findByText(/Your balance until your next loan/),
    ).toBeInTheDocument();
  });

  it("clears the forecast when a new chat starts", async () => {
    stubReply();
    const onForecast = vi.fn();

    render(<Chat userId="demo-josh" onForecast={onForecast} />);
    sendQuestion();
    await screen.findByText("An answer.");

    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));

    expect(onForecast).toHaveBeenLastCalledWith(null);
  });
});
