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
 * Comprehensive intent-based reply generator. Covers savings goals, daily budgets,
 * benefits, debt, emergency funds, and general finance questions — all personalised
 * with the user's real numbers. No external API needed.
 */
function generateSmartReply(
  question: string,
  finance: CustomFinance,
  forecast: BalanceForecast | undefined,
): string {
  const q = question.toLowerCase().replace(/[?!.,]/g, " ");

  const day = (iso: string | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        })
      : "soon";

  const daysUntil = Math.max(
    1,
    Math.ceil(
      (new Date(finance.nextIncomeDate).getTime() - Date.now()) / 86_400_000,
    ),
  );
  const nextIncomeLabel = day(finance.nextIncomeDate);
  const surplus = Math.round(
    finance.nextIncomeAmount - finance.monthlyBills - finance.weeklySpend * 4.33,
  );
  const noShortfall = forecast?.hasShortfall === false;
  const shortfallDate = day(forecast?.firstShortfallDate);
  const shortfallAmt = forecast?.firstShortfallAmount
    ? Math.abs(Math.round(forecast.firstShortfallAmount))
    : null;

  // ── 1. Status / how am I doing ───────────────────────────────────────────
  if (
    /\b(am i (good|ok|okay|fine|alright)|how (is it|am i|are (we|things))|doing (ok|good|well)|how.?s it going|all good|everything ok)\b/.test(
      q,
    )
  ) {
    if (noShortfall)
      return `You're doing well — no shortfall projected before ${nextIncomeLabel}. With a monthly surplus of about £${surplus}, you're in a stable position. Anything specific you'd like to look at?`;
    return `Not quite — your balance will dip around ${shortfallDate}${shortfallAmt ? `, about £${shortfallAmt} short` : ""}. Worth having a plan — want some options?`;
  }

  // ── 2. Savings goal with a price ─────────────────────────────────────────
  const priceMatch = q.match(/£\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:pound|quid)/);
  const price = priceMatch
    ? parseInt((priceMatch[1] ?? priceMatch[2] ?? "0").replace(/,/g, ""))
    : null;

  const savingsItem =
    q.match(
      /\b(car|vehicle|motorbike|bike|holiday|vacation|trip|phone|iphone|android|laptop|computer|pc|mac|house|flat|deposit|sofa|tv|ring|watch|camera|console|ps5|xbox|airpods)\b/,
    )?.[1] ?? null;

  if (
    savingsItem ||
    /\b(save (for|up)|saving (for|up)|how long.{0,15}save|when can i (buy|afford|get)|afford to buy)\b/.test(
      q,
    )
  ) {
    const item = savingsItem ?? "that";
    if (surplus <= 0)
      return `Right now your monthly outgoings exceed income by about £${Math.abs(surplus)}, so saving for a ${item} needs some breathing room first. Reducing a regular bill or picking up extra income would open that up quickly.`;
    if (price) {
      const months = Math.ceil(price / surplus);
      const years = Math.floor(months / 12);
      const rem = months % 12;
      const timeLabel =
        years > 0
          ? `${years} year${years > 1 ? "s" : ""}${rem > 0 ? ` and ${rem} month${rem > 1 ? "s" : ""}` : ""}`
          : `${months} month${months > 1 ? "s" : ""}`;
      return `With a monthly surplus of about £${surplus}, saving £${price.toLocaleString()} for a ${item} would take roughly **${timeLabel}**. Setting up a standing order on payday makes it automatic — you won't miss what you don't see.`;
    }
    return `With a monthly surplus of about £${surplus}, you have real saving power. Tell me the price of the ${item} and I'll give you a specific timeline.`;
  }

  // ── 3. Daily / weekly spend limit ────────────────────────────────────────
  if (
    /\b(how much (can|should|could) i spend|safe to spend|daily (budget|limit|spend)|per day|each day|spend a day|day to day)\b/.test(
      q,
    )
  ) {
    const available = Math.max(
      0,
      finance.balance - finance.monthlyBills * (daysUntil / 30),
    );
    const dailySafe = Math.max(
      0,
      Math.round(available / daysUntil - finance.weeklySpend / 7),
    );
    if (dailySafe < 2)
      return `With ${daysUntil} days until ${nextIncomeLabel} and bills coming up, your budget is very tight beyond your regular £${finance.weeklySpend}/week on essentials. I'd hold off on any extras until your income arrives.`;
    return `With ${daysUntil} days until ${nextIncomeLabel}, you have about **£${dailySafe} extra per day** on top of your regular essentials (£${Math.round(dailySafe * 7)}/week in flexible spend). That's based on your current balance and upcoming bills.`;
  }

  // ── 4. Universal Credit / benefits ───────────────────────────────────────
  if (
    /\b(universal credit|uc |benefit|dwp|housing benefit|tax credit|pip |dla |esa |jsa |council tax reduction|entitled to)\b/.test(
      q,
    )
  ) {
    return `Universal Credit is worth checking if your income is variable or below about £1,200/month take-home. The Turn2us benefits calculator takes 10 minutes and is free — it covers UC, council tax reduction, free school meals, and more. Citizens Advice can also do a full entitlements check in a free 30-minute call.`;
  }

  // ── 5. Hardship / emergency funds / grants ───────────────────────────────
  if (
    /\b(hardship fund|emergency fund|emergency grant|council grant|household support|food bank|citizen.?s advice|charity help|crisis fund)\b/.test(
      q,
    )
  ) {
    return `The Household Support Fund gives council grants for food, energy, and essentials — no repayment needed. Contact your local council directly or ask Citizens Advice to find what's available in your area. If you're a student, most UK universities also have hardship funds that can pay out within a week.`;
  }

  // ── 6. How to save / budgeting tips ──────────────────────────────────────
  if (
    /\b(save money|cut (back|costs|spending)|reduce (spending|costs|bills)|budget tips|how to budget|spend less|frugal|money saving)\b/.test(
      q,
    )
  ) {
    if (surplus > 0)
      return `You already have a surplus of about £${surplus}/month — the key is making it automatic. Set a standing order to a separate savings account on payday (even £${Math.min(surplus, 100)}/month adds up to £${Math.min(surplus, 100) * 12} a year). For quick cuts, check direct debits for unused subscriptions first.`;
    return `The quickest wins: cancel unused subscriptions, switch to own-brand groceries (saves 20–30% on food), and check whether you're on the cheapest energy tariff. Citizens Advice can also check if you're claiming all entitlements — that's often the biggest unlock.`;
  }

  // ── 7. Extra income / side hustle ────────────────────────────────────────
  if (
    /\b(extra (money|income|cash)|earn more|side (job|hustle|income|gig)|make more money|overtime|second job|freelance|part.?time)\b/.test(
      q,
    )
  ) {
    return `A few practical options: picking up extra shifts, selling unused items online (eBay, Vinted, Facebook Marketplace), or task platforms like TaskRabbit or Deliveroo for one-off income. Even £${Math.max(50, Math.round(surplus * 0.5))}/month extra makes a real difference to your buffer.`;
  }

  // ── 8. Unexpected bill / what-if ─────────────────────────────────────────
  if (
    /\b(unexpected|emergency cost|what if (i|my)|boiler|car (repair|broke)|bill came|suddenly (need|have)|large bill)\b/.test(
      q,
    )
  ) {
    if (noShortfall)
      return `Your balance of £${finance.balance} should absorb a moderate unexpected cost. If a bill arrived this week you'd still make it to ${nextIncomeLabel} — though with less breathing room. Long-term, an emergency buffer of 3× monthly essentials (around £${Math.round(finance.weeklySpend * 4.33 * 3)} for you) is the target.`;
    return `With a shortfall already projected, an unexpected bill would make things tighter. The Household Support Fund and Citizens Advice are the fastest places to look for emergency help — council grants can come through within days.`;
  }

  // ── 9. Investments / what to do with extra money ─────────────────────────
  if (
    /\b(invest|investment|stocks|shares|isa|pension|crypto|savings account|interest rate|premium bond)\b/.test(
      q,
    )
  ) {
    if (surplus > 100)
      return `With a surplus of about £${surplus}/month, the priority order is: 1) emergency fund (3 months of essentials, ~£${Math.round(finance.weeklySpend * 13)} for you), 2) Cash ISA or easy-access savings account (currently 4–5% AER), 3) workplace pension if your employer matches. That sequence gives the best risk-adjusted return before touching stocks.`;
    return `Before investing it's worth building a small emergency buffer first — 1 month of essentials gives you a cushion so you never have to sell at a bad time. A Cash ISA or easy-access savings account (4–5% AER) is a great starting point.`;
  }

  // ── 10. Rent / housing ───────────────────────────────────────────────────
  if (
    /\b(rent|landlord|tenancy|housing|eviction|deposit|housing benefit|renew|notice)\b/.test(
      q,
    )
  ) {
    return `Rent is usually the biggest fixed cost. If you're worried about missing a payment, contact your landlord early — most would rather agree a short payment plan than start proceedings. Shelter and Citizens Advice both offer free housing advice, including if you're facing eviction risk.`;
  }

  // ── 11. Debt / overdraft ─────────────────────────────────────────────────
  if (
    /\b(debt|overdraft|credit card|loan repay|owe money|borrow|high interest|minimum payment|missed payment)\b/.test(
      q,
    )
  ) {
    return `The quickest debt wins: pay off the highest-interest balance first (usually credit cards), then work down. StepChange and Citizens Advice both offer free, confidential debt advice — they can often negotiate with creditors directly. If you're in an overdraft, ask your bank about a 0% buffer first.`;
  }

  // ── 12. General finance question (mentions money) ────────────────────────
  if (
    /\b(money|finance|financial|budget|cash|afford|cost|price|pay|income|wage|salary|spend)\b/.test(
      q,
    )
  ) {
    if (noShortfall)
      return `Based on your numbers — £${finance.balance} now, next income of £${finance.nextIncomeAmount} on ${nextIncomeLabel} — you're in a solid position with no shortfall. What specifically would you like to plan for?`;
    return `With £${finance.balance} and a projected dip around ${shortfallDate}, this is worth planning around. What's on your mind — cutting costs, finding support, or something else?`;
  }

  // ── 13. Off-topic redirect ───────────────────────────────────────────────
  return `I'm best at money questions — things like whether you'll run short, how long to save for something, or what support you could access. What would be most useful?`;
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

        // Build finance context for the smart reply generator.
        const { finance: personaFinanceData } = personaFinance(
          body.userId,
          new Date(),
        );
        const financeForReply: CustomFinance =
          body.customFinance ?? {
            balance: personaFinanceData.openingBalance,
            nextIncomeDate: personaFinanceData.nextMaintenanceLoanDate,
            nextIncomeAmount:
              personaFinanceData.transactions.find((t) => t.amount > 0)
                ?.amount ?? 0,
            monthlyBills: Math.abs(
              personaFinanceData.transactions.find((t) => t.amount < 0)
                ?.amount ?? 0,
            ),
            weeklySpend: personaFinanceData.weeklyEssentials.amount,
          };

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

        // Always replace n8n's mechanical reply with our smart, question-aware reply.
        if (response) {
          response.reply = generateSmartReply(
            body.message,
            financeForReply,
            response.forecast,
          );
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
