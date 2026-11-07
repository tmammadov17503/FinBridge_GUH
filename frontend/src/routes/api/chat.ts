import { createFileRoute } from "@tanstack/react-router";

import {
  ConfigError,
  anthropicKey,
  n8nAuthHeaders,
  n8nUrl,
} from "@/lib/finbridge/server-config";
import { ChatBody, toChatResponse } from "@/lib/finbridge/normalize";
import type { BalanceForecast, CustomFinance } from "@/lib/finbridge/types";

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

/**
 * Call the Anthropic Messages API directly so we can answer ANY question naturally,
 * using the user's finance data as context. Runs in parallel with the n8n forecast call
 * so it adds no extra wall-clock time. Falls back to undefined if the key isn't set.
 */
async function askClaude(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
  apiKey: string,
): Promise<string | undefined> {
  const messages = [...history, { role: "user" as const, content: question }];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 350,
        system: systemPrompt,
        messages,
      }),
      signal: AbortSignal.timeout(14_000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json().catch(() => null)) as {
      content?: { type: string; text: string }[];
    } | null;
    return data?.content?.[0]?.text?.trim() ?? undefined;
  } catch {
    return undefined;
  }
}

function buildSystemPrompt(
  finance: CustomFinance | null | undefined,
  forecast: BalanceForecast | undefined,
  personaLabel: string,
): string {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });

  let context = "";
  if (finance) {
    const surplus =
      finance.nextIncomeAmount -
      finance.monthlyBills -
      finance.weeklySpend * 4.33;
    context =
      `Current balance: £${finance.balance}. ` +
      `Next income: £${finance.nextIncomeAmount} on ${fmtDate(finance.nextIncomeDate)}. ` +
      `Monthly bills/rent: £${finance.monthlyBills}. ` +
      `Weekly essentials: £${finance.weeklySpend}. ` +
      `Estimated monthly surplus: £${Math.round(surplus)}.`;
  } else {
    context = `Demo persona: ${personaLabel}.`;
  }

  const forecastLine = forecast
    ? forecast.hasShortfall === false
      ? "Forecast: no shortfall — balance stays positive until next income."
      : `Forecast: balance dips below zero around ${fmtDate(forecast.firstShortfallDate ?? "")}` +
        (forecast.firstShortfallAmount != null
          ? `, about £${Math.abs(Math.round(forecast.firstShortfallAmount))} short`
          : "") +
        "."
    : "";

  return [
    "You are FinBridge, a friendly UK financial coaching assistant. Be warm, concise (2-4 sentences), and practical.",
    "Focus on the user's actual question. Use their finance data when relevant.",
    "For savings/planning questions, use their monthly surplus to give a concrete timeline.",
    "For support/benefits questions, mention Universal Credit, council hardship funds, or Citizens Advice as relevant.",
    "Never invent specific URLs. Never give regulated financial advice. Always caveat with 'check eligibility directly'.",
    "",
    "User finance context:",
    context,
    forecastLine,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * n8n's Code node generates a mechanical template reply ("Your projected lowest balance
 * is…"). For "Me" mode we discard that text and write a natural reply from the forecast
 * data ourselves, so the response reads like a human adviser, not a report.
 */
function fmtDay(iso: string | undefined): string {
  if (!iso) return "soon";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function naturalMeReply(question: string, forecast: BalanceForecast): string {
  const q = question.toLowerCase();

  // Detect simple / conversational follow-ups that don't need a full re-analysis.
  const isConversational =
    q.length < 70 &&
    !/£|\bshort\b|\brun out\b|\bshift|\bbill|\brent|\bsupport|\bfund|\bhardship/.test(
      q,
    );

  if (forecast.hasShortfall === false) {
    if (isConversational) {
      return (
        "Yes — your numbers look solid this month. No shortfall projected before your next income arrives. " +
        "The chart shows your balance staying positive throughout. Feel free to ask about anything specific!"
      );
    }
    const series = forecast.dailySeries ?? [];
    const minBal = series.length
      ? Math.round(Math.min(...series.map((d) => d.balance)))
      : null;
    const minText =
      minBal !== null ? ` Your lowest point is around £${minBal}.` : "";
    return (
      `Your balance holds up all the way through to your next income — no shortfall projected.${minText} ` +
      `The chart above shows the full picture. ` +
      `Would you like to explore a scenario, like what an unexpected bill or fewer hours would do?`
    );
  }

  // Has shortfall
  const date = fmtDay(forecast.firstShortfallDate);
  const amount = Math.abs(forecast.firstShortfallAmount ?? 0);

  if (isConversational) {
    return (
      `Not quite — your balance is set to dip below zero around ${date}, about £${amount} short at the worst point. ` +
      `Worth looking at options to cover that gap. Would you like me to suggest some?`
    );
  }

  return (
    `Looking at your numbers, your balance goes below zero around **${date}** — roughly **£${amount} short** at the lowest point. ` +
    `The chart above shows the full timeline.\n\n` +
    `A few options worth considering: checking whether you qualify for any support funds, cutting non-essential spend in the short term, ` +
    `or planning a conversation with your landlord or bank ahead of time. What would be most useful to look at?`
  );
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

        // Build system prompt for Claude using the finance context we already have.
        const { finance: personaFinanceData } = personaFinance(
          body.userId,
          new Date(),
        );
        const claudeKey = anthropicKey();
        const financeForPrompt =
          body.customFinance ??
          ({
            balance: personaFinanceData.openingBalance,
            nextIncomeDate: personaFinanceData.nextMaintenanceLoanDate,
            nextIncomeAmount: personaFinanceData.transactions.find(
              (t) => t.amount > 0,
            )?.amount ?? 0,
            monthlyBills: Math.abs(
              personaFinanceData.transactions.find((t) => t.amount < 0)
                ?.amount ?? 0,
            ),
            weeklySpend: personaFinanceData.weeklyEssentials.amount,
          } satisfies CustomFinance);

        // Run n8n (for forecast data) and Claude (for the reply) in parallel.
        const [upstreamResult, claudeReply] = await Promise.allSettled([
          fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(
              buildFinancePayload(body.message, body.userId, body.customFinance),
            ),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          }),
          claudeKey
            ? askClaude(
                buildSystemPrompt(financeForPrompt, undefined, body.userId),
                body.history ?? [],
                body.message,
                claudeKey,
              )
            : Promise.resolve(undefined),
        ]);

        if (
          upstreamResult.status === "rejected" ||
          !(upstreamResult.value instanceof Response)
        ) {
          const err = upstreamResult.status === "rejected" ? upstreamResult.reason : null;
          const timedOut = err instanceof Error && err.name === "TimeoutError";
          console.error("[finbridge] chat webhook unreachable", err);
          return bad(
            504,
            timedOut
              ? "FinBridge took too long to answer. Try asking again."
              : "Could not reach FinBridge. Check the agent is running.",
          );
        }

        const upstream = upstreamResult.value;
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

        // Use Claude's reply if available (question-aware, conversational).
        // Fall back to our naturalMeReply generator, then to n8n's raw text.
        const claudeText =
          claudeReply.status === "fulfilled" ? claudeReply.value : undefined;
        if (response) {
          if (claudeText) {
            response.reply = claudeText;
          } else if (response.forecast) {
            response.reply = naturalMeReply(body.message, response.forecast);
          }
        }

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
