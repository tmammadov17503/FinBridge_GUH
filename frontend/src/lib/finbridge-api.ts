import { createServerFn } from "@tanstack/react-start";

// ── Types (mirror n8n finalize.js response — see knowledge/README.md) ──────────

export interface SupportSource {
  id: string;
  title: string;
  provider: string;
  url: string;
  summary: string;
  actionLabel: string;
  caution: string;
}

export interface FinBridgeForecast {
  lowestBalance: number;
  lowestBalanceDate: string;
  firstShortfallDate: string | null;
  balanceBeforeNextLoan: number;
  nextMaintenanceLoanDate: string;
  hasShortfall: boolean;
}

export interface FinBridgeResponse {
  forecast: FinBridgeForecast;
  explanation: string;
  draft: string;
  supportSources: SupportSource[];
  supportStatus: "ok" | "unavailable";
  /** "model" when Anthropic classified successfully; "fallback" when it failed. */
  draftStatus: "model" | "fallback";
  catalogueCheckedAt: string | null;
}

export interface FinBridgeError {
  code: string;
  message?: string;
}

export type FinBridgeResult =
  | { ok: true; data: FinBridgeResponse }
  | { ok: false; status: number; error: FinBridgeError };

// ── Server-side helpers ───────────────────────────────────────────────────────
// Everything below the createServerFn boundary runs only on the server.
// Set FINBRIDGE_WEBHOOK_URL in Lovable Secrets (or .env) to override the default.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Synthetic payload — no personal data. All transactions fall before the loan date. */
function buildPayload(question: string) {
  const today = new Date();
  const loanDate = addDays(today, 30);
  return {
    question,
    university: "University of Manchester",
    noFamilySupport: false,
    finance: {
      startDate: isoDate(today),
      openingBalance: 200,
      nextMaintenanceLoanDate: isoDate(loanDate),
      transactions: [
        { date: isoDate(addDays(today, 7)), amount: 100, label: "Wages" },
        { date: isoDate(addDays(today, 20)), amount: -300, label: "Rent" },
      ],
      weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 20 },
    },
  };
}

const chatServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const q =
      typeof data === "object" &&
      data !== null &&
      "question" in (data as object)
        ? String((data as { question: unknown }).question ?? "").slice(0, 500)
        : "";
    return { question: q };
  })
  .handler(async (ctx): Promise<FinBridgeResult> => {
    const WEBHOOK_URL =
      process.env.FINBRIDGE_WEBHOOK_URL ??
      "https://tagihan.app.n8n.cloud/webhook/finbridge/chat";
    const { question } = ctx.data;
    try {
      const upstream = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(question)),
      });
      const json = (await upstream.json()) as Record<string, unknown>;
      if (upstream.status === 400) {
        return {
          ok: false,
          status: 400,
          error: (json.error as FinBridgeError) ?? { code: "INVALID_INPUT" },
        };
      }
      if (!upstream.ok) {
        return {
          ok: false,
          status: 502,
          error: { code: "UPSTREAM_ERROR", message: "FinBridge service error." },
        };
      }
      return { ok: true, data: json as FinBridgeResponse };
    } catch {
      return {
        ok: false,
        status: 0,
        error: {
          code: "UPSTREAM_ERROR",
          message: "Could not reach the FinBridge service.",
        },
      };
    }
  });

// ── Public client API ─────────────────────────────────────────────────────────

export async function askFinBridge(question: string): Promise<FinBridgeResult> {
  try {
    return await chatServerFn({ data: { question } });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not reach the FinBridge service.";
    return { ok: false, status: 0, error: { code: "NETWORK_ERROR", message } };
  }
}
