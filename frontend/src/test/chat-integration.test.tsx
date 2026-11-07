import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Chat } from "@/components/finbridge/Chat";
import type { FinBridgeResult } from "@/lib/finbridge-api";

// Mock the entire module so tests are independent of the internal transport
// (createServerFn, fetch, etc.) and only verify Chat component behaviour.
vi.mock("@/lib/finbridge-api", () => ({
  askFinBridge: vi.fn(),
}));

// Import after mock so we get the mocked version
import { askFinBridge } from "@/lib/finbridge-api";
const mockAsk = vi.mocked(askFinBridge);

const baseForecast = {
  lowestBalance: -60,
  lowestBalanceDate: "2026-11-21",
  firstShortfallDate: "2026-11-21",
  balanceBeforeNextLoan: 160,
  nextMaintenanceLoanDate: "2026-12-05",
  hasShortfall: true,
};

const okResponse: FinBridgeResult = {
  ok: true,
  data: {
    forecast: baseForecast,
    explanation:
      "Your projected lowest balance is -£60.00 on 2026-11-21. Your first projected shortfall is on 2026-11-21.",
    draft: "Hello, I would like to discuss my financial situation.",
    supportSources: [
      {
        id: "student-minds-budget",
        title: "How to make a student budget",
        provider: "Student Minds",
        url: "https://www.studentminds.org.uk/advice-and-info/how-to-make-a-student-budget/",
        summary: "Student Minds explains how to plan a budget.",
        actionLabel: "Read student budgeting guidance",
        caution: "Eligibility depends on the provider.",
      },
    ],
    supportStatus: "ok",
    draftStatus: "model",
    catalogueCheckedAt: "2026-11-07",
  },
};

function typeAndSend(question: string) {
  fireEvent.change(screen.getByLabelText("Your question"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the initial greeting", () => {
    render(<Chat />);
    expect(screen.getByText(/Hi, I'm FinBridge/)).toBeInTheDocument();
  });

  it("displays explanation and source card on success", async () => {
    mockAsk.mockResolvedValue(okResponse);

    render(<Chat />);
    typeAndSend("Can I cover rent?");

    await waitFor(() =>
      expect(screen.getByText(/projected lowest balance/)).toBeInTheDocument(),
    );
    expect(screen.getByText("How to make a student budget")).toBeInTheDocument();
  });

  it("shows an error message on HTTP 400", async () => {
    const result: FinBridgeResult = {
      ok: false,
      status: 400,
      error: { code: "INVALID_INPUT" },
    };
    mockAsk.mockResolvedValue(result);

    render(<Chat />);
    typeAndSend("bad input");

    await waitFor(() =>
      expect(screen.getByText(/Invalid request/)).toBeInTheDocument(),
    );
  });

  it("shows fallback notice when draftStatus is fallback", async () => {
    const base = (okResponse as Extract<FinBridgeResult, { ok: true }>).data;
    const result: FinBridgeResult = {
      ok: true,
      data: { ...base, draftStatus: "fallback" },
    };
    mockAsk.mockResolvedValue(result);

    render(<Chat />);
    typeAndSend("help");

    await waitFor(() =>
      expect(
        screen.getByText(/AI classification unavailable/),
      ).toBeInTheDocument(),
    );
  });

  it("shows sources unavailable notice when supportStatus is unavailable", async () => {
    const result: FinBridgeResult = {
      ok: true,
      data: {
        ...(okResponse as Extract<FinBridgeResult, { ok: true }>).data,
        supportStatus: "unavailable",
        supportSources: [],
      },
    };
    mockAsk.mockResolvedValue(result);

    render(<Chat />);
    typeAndSend("help");

    await waitFor(() =>
      expect(
        screen.getByText(/Support sources temporarily unavailable/),
      ).toBeInTheDocument(),
    );
  });
});
