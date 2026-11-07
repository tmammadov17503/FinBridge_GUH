import { createFileRoute } from "@tanstack/react-router";

import {
  ConfigError,
  n8nAuthHeaders,
  n8nUrl,
} from "@/lib/finbridge/server-config";
import { ChatBody, toChatResponse } from "@/lib/finbridge/normalize";
import type { CustomFinance } from "@/lib/finbridge/types";

/**
 * Browser -> n8n chat proxy.
 *
 * Keeps the n8n URL and webhook secret server-side. Builds a finance payload
 * appropriate for each demo persona so Amira, Josh, and Priya get meaningfully
 * different forecasts. When the user selects "Me" and fills in their own numbers,
 * those values drive the payload instead.
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

type FinanceBlock = {
  startDate: string;
  openingBalance: number;
  nextMaintenanceLoanDate: string;
  transactions: { date: string; amount: number; label: string }[];
  weeklyEssentials: { firstDate: string; amount: number };
};

type ScenarioBBlock = {
  transactions: { date: string; amount: number; label: string }[];
  weeklyEssentials: { firstDate: string; amount: number };
} | null;

function personaFinance(
  userId: string,
  today: Date,
): { finance: FinanceBlock; scenarioB: ScenarioBBlock; university: string } {
  switch (userId) {
    case "demo-amira":
      return {
        university: "Manchester Metropolitan University",
        finance: {
          startDate: isoDate(today),
          openingBalance: 180,
          nextMaintenanceLoanDate: isoDate(addDays(today, 60)),
          transactions: [
            { date: isoDate(addDays(today, 7)), amount: -120, label: "Childcare" },
            { date: isoDate(addDays(today, 14)), amount: 480, label: "Wages" },
            { date: isoDate(addDays(today, 25)), amount: -650, label: "Rent" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 35 },
        },
        scenarioB: {
          transactions: [
            { date: isoDate(addDays(today, 7)), amount: -120, label: "Childcare" },
            { date: isoDate(addDays(today, 14)), amount: 200, label: "Wages (fewer shifts)" },
            { date: isoDate(addDays(today, 25)), amount: -650, label: "Rent" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 35 },
        },
      };

    case "demo-josh":
      return {
        university: "University of Manchester",
        finance: {
          startDate: isoDate(today),
          openingBalance: 350,
          nextMaintenanceLoanDate: isoDate(addDays(today, 45)),
          transactions: [
            { date: isoDate(addDays(today, 20)), amount: -480, label: "Rent" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 25 },
        },
        scenarioB: {
          transactions: [
            { date: isoDate(addDays(today, 10)), amount: -150, label: "Laptop repair" },
            { date: isoDate(addDays(today, 20)), amount: -480, label: "Rent" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 25 },
        },
      };

    case "demo-priya":
      return {
        university: "University of Leeds",
        finance: {
          startDate: isoDate(today),
          openingBalance: 1200,
          nextMaintenanceLoanDate: isoDate(addDays(today, 90)),
          transactions: [
            { date: isoDate(addDays(today, 25)), amount: -850, label: "Rent" },
            { date: isoDate(addDays(today, 28)), amount: 1800, label: "Salary" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 50 },
        },
        scenarioB: {
          transactions: [
            { date: isoDate(addDays(today, 25)), amount: -850, label: "Rent" },
            { date: isoDate(addDays(today, 28)), amount: 1200, label: "Salary (unpaid leave)" },
          ],
          weeklyEssentials: { firstDate: isoDate(addDays(today, 2)), amount: 50 },
        },
      };

    default:
      // Fallback generic profile
      return {
        university: "University of Manchester",
        finance: {
          startDate: isoDate(today),
          openingBalance: 200,
          nextMaintenanceLoanDate: isoDate(addDays(today, 30)),
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
}

function buildFinancePayload(
  question: string,
  userId: string,
  customFinance?: CustomFinance,
) {
  const today = new Date();

  if (customFinance) {
    return {
      question,
      university: "Your university",
      noFamilySupport: false,
      finance: {
        startDate: isoDate(today),
        openingBalance: customFinance.balance,
        nextMaintenanceLoanDate: isoDate(addDays(today, 90)),
        transactions: [
          {
            date: customFinance.nextIncomeDate,
            amount: customFinance.nextIncomeAmount,
            label: "Income",
          },
          {
            date: isoDate(addDays(today, 25)),
            amount: -customFinance.monthlyBills,
            label: "Bills & rent",
          },
        ],
        weeklyEssentials: {
          firstDate: isoDate(addDays(today, 2)),
          amount: customFinance.weeklySpend,
        },
      },
    };
  }

  const { finance, scenarioB, university } = personaFinance(userId, today);
  return {
    question,
    university,
    noFamilySupport: false,
    finance,
    ...(scenarioB ? { scenarioB } : {}),
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
            body: JSON.stringify(
              buildFinancePayload(body.message, body.userId, body.customFinance),
            ),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          });
        } catch (error) {
          const timedOut =
            error instanceof Error && error.name === "TimeoutError";
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
