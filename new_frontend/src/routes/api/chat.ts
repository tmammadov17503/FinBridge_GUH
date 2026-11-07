import { createFileRoute } from "@tanstack/react-router";

import {
  ConfigError,
  n8nAuthHeaders,
  n8nUrl,
} from "@/lib/finbridge/server-config";
import { ChatBody, toChatResponse } from "@/lib/finbridge/normalize";

/**
 * Browser -> n8n chat proxy.
 *
 * It exists so the n8n URL and any webhook secret stay on the server, and so the browser
 * talks to one stable shape no matter how the workflow's response is nested.
 *
 * The n8n FinBridge workflow expects a finance payload (question + synthetic finance data),
 * not a plain chat message. We build a synthetic payload here from the user's question.
 * All figures are illustrative; no personal data is sent.
 */

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

/** Builds the synthetic finance payload the n8n workflow expects. */
function buildFinancePayload(question: string) {
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
    scenarioB: {
      transactions: [
        { date: isoDate(addDays(today, 7)), amount: 50, label: "Wages (reduced)" },
        { date: isoDate(addDays(today, 20)), amount: -300, label: "Rent" },
      ],
      weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 20 },
    },
  };
}

/** n8n and the LLM behind it are slow; fail with a readable message rather than hanging. */
const UPSTREAM_TIMEOUT_MS = 45_000;

function bad(status: number, error: string, detail?: string): Response {
  return Response.json({ error, detail }, { status });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return bad(400, "Expected a JSON body.");
        }

        const parsed = ChatBody.safeParse(raw);
        if (!parsed.success) {
          return bad(
            400,
            "That message could not be sent.",
            parsed.error.issues[0]?.message,
          );
        }
        const body = parsed.data;

        let url: string;
        let headers: Record<string, string>;
        try {
          url = n8nUrl("finbridge/chat");
          headers = { "content-type": "application/json", ...n8nAuthHeaders() };
        } catch (error) {
          if (error instanceof ConfigError) {
            console.error(`[finbridge] ${error.message}`);
            return bad(
              503,
              "FinBridge is not connected to its agent yet.",
              `Missing ${error.missing} on the server.`,
            );
          }
          throw error;
        }

        let upstream: Response;
        try {
          upstream = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(buildFinancePayload(body.message)),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          });
        } catch (error) {
          const timedOut =
            error instanceof Error && error.name === "TimeoutError";
          // Log the detail server-side; never return the upstream URL to the browser.
          console.error("[finbridge] chat webhook unreachable", error);
          return bad(
            504,
            timedOut
              ? "FinBridge took too long to answer. Try asking again."
              : "Could not reach FinBridge. Check the agent is running.",
          );
        }

        if (!upstream.ok) {
          const detail = (await upstream.text().catch(() => "")).slice(0, 500);
          console.error(
            `[finbridge] chat webhook ${upstream.status}: ${detail}`,
          );
          return bad(
            502,
            upstream.status === 404
              ? "The FinBridge chat workflow is not active in n8n."
              : "FinBridge could not answer that just now.",
            `Agent returned ${upstream.status}.`,
          );
        }

        const payload = await upstream.json().catch(() => null);
        const response = toChatResponse(payload, {
          userId: body.userId,
          sessionId: body.sessionId,
        });

        if (!response) {
          console.error(
            "[finbridge] chat webhook returned no reply field",
            payload,
          );
          return bad(502, "FinBridge replied with nothing. Try asking again.");
        }

        return Response.json(response, {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
