/**
 * Pre-made demo answers for Amira, Josh and Priya.
 * All dates are computed relative to today so they always look current.
 * "Me" mode bypasses this entirely and hits the real n8n / Anthropic API.
 */
import type { BalanceForecast, SupportSource } from "@/lib/finbridge/types";

export interface CannedAnswer {
  reply: string;
  forecast?: BalanceForecast;
  sources?: SupportSource[];
}

// ── date helpers ────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function add(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// ── forecast series generator ────────────────────────────────────────────────

function series(
  today: Date,
  opening: number,
  txs: { day: number; amount: number }[],
  weeklyAmount: number,
  days: number,
): { date: string; balance: number }[] {
  const changes = new Map<number, number>();
  for (const tx of txs) {
    changes.set(tx.day, (changes.get(tx.day) ?? 0) + tx.amount);
  }
  for (let d = 2; d <= days; d += 7) {
    changes.set(d, (changes.get(d) ?? 0) - weeklyAmount);
  }
  const out: { date: string; balance: number }[] = [];
  let bal = opening;
  for (let d = 0; d <= days; d++) {
    bal += changes.get(d) ?? 0;
    out.push({ date: iso(add(today, d)), balance: Math.round(bal) });
  }
  return out;
}

// ── common sources ───────────────────────────────────────────────────────────

const UC: SupportSource = {
  id: "uc",
  title: "Universal Credit — check if you qualify",
  provider: "GOV.UK",
  url: "https://www.gov.uk/universal-credit",
  summary:
    "Tops up low or variable income. Zero-hours workers can claim and it adjusts each month as wages change. Includes a child element worth up to £290/month.",
  caution:
    "Eligibility and amounts are set by DWP. This prototype does not apply on your behalf.",
};

const TURN2US: SupportSource = {
  id: "turn2us",
  title: "Benefits calculator",
  provider: "Turn2us",
  url: "https://www.turn2us.org.uk/get-support/find-out-what-you-can-get",
  summary:
    "Free calculator that estimates which benefits and grants you may be entitled to based on your situation. Takes about 10 minutes.",
  caution: "Estimates only. Final decisions are made by the relevant authority.",
};

const CITIZENS_ADVICE: SupportSource = {
  id: "ca",
  title: "Free benefits check",
  provider: "Citizens Advice",
  url: "https://www.citizensadvice.org.uk/benefits/",
  summary:
    "Citizens Advice can check all your entitlements in a 30-minute conversation — online, by phone, or in person. Free and confidential.",
  caution: "Independent charity. This link does not share your data with FinBridge.",
};

const HSF: SupportSource = {
  id: "hsf",
  title: "Household Support Fund",
  provider: "Citizens Advice",
  url: "https://www.citizensadvice.org.uk/benefits/help-if-on-a-low-income/household-support-fund/",
  summary:
    "Councils give grants for food, energy and essential costs. No repayment needed. Apply through your local council.",
  caution: "Availability varies by council and funding period.",
};

const UNI_HARDSHIP: SupportSource = {
  id: "uni-hardship",
  title: "University hardship funds",
  provider: "UCAS",
  url: "https://www.ucas.com/money-and-student-life/money/financial-support-your-university-or-college/hardship-funds",
  summary:
    "Most UK universities have a hardship or access fund. Applications go through Student Services and often pay out within 5-7 days. Usually non-repayable.",
  caution: "Availability and amounts vary by institution. Contact your university directly.",
};

const STUDENT_FINANCE: SupportSource = {
  id: "student-finance",
  title: "Extra student finance",
  provider: "Student Finance England",
  url: "https://www.gov.uk/student-finance/extra-help",
  summary:
    "Additional grants for students who need extra support — including those with dependants or specific circumstances.",
  caution: "Eligibility assessed by Student Finance England. Apply via the student finance portal.",
};

const STUDENT_MINDS: SupportSource = {
  id: "student-minds",
  title: "Student financial wellbeing guide",
  provider: "Student Minds",
  url: "https://www.studentminds.org.uk/financialwellbeing.html",
  summary:
    "Practical advice for managing money as a student, including what to do when the loan does not cover everything.",
  caution: "General guidance only. Refer to your own university's policies for specifics.",
};

const MONEY_HELPER: SupportSource = {
  id: "moneyhelper",
  title: "Budget planner",
  provider: "MoneyHelper",
  url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner",
  summary:
    "Free government-backed tool to map income, spending and savings. Helps spot shortfalls before they happen.",
  caution: "Planning tool only. Does not access your bank account.",
};

const SAVINGS_GUIDE: SupportSource = {
  id: "savings",
  title: "How to build an emergency fund",
  provider: "MoneyHelper",
  url: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/emergency-fund",
  summary:
    "Explains what an emergency fund is, how much to aim for, and where to keep it. Covers ISAs and easy-access accounts.",
  caution: "Interest rates change — check current rates with your bank.",
};

// ── main export ──────────────────────────────────────────────────────────────

export function buildDemoCanned(today: Date): Record<string, CannedAnswer[]> {
  // ── Amira ──────────────────────────────────────────────────────────────────
  const amiraBase = series(today, 180, [
    { day: 7, amount: -120 },
    { day: 14, amount: 480 },
    { day: 25, amount: -650 },
  ], 35, 30);

  const amiraChanged = series(today, 180, [
    { day: 7, amount: -120 },
    { day: 14, amount: 200 },
    { day: 25, amount: -650 },
  ], 35, 30);

  const amiraShortfall = amiraBase.find((d) => d.balance < 0);

  const amiraForecast: BalanceForecast = {
    hasShortfall: true,
    firstShortfallDate: amiraShortfall?.date,
    firstShortfallAmount: amiraShortfall?.balance,
    dailySeries: amiraBase,
    scenarios: {
      base: { dailySeries: amiraBase },
      changed: { dailySeries: amiraChanged },
    },
  };

  // ── Josh ───────────────────────────────────────────────────────────────────
  const joshBase = series(today, 350, [
    { day: 20, amount: -480 },
  ], 25, 45);

  const joshChanged = series(today, 350, [
    { day: 10, amount: -150 },
    { day: 20, amount: -480 },
  ], 25, 45);

  const joshShortfall = joshBase.find((d) => d.balance < 0);

  const joshForecast: BalanceForecast = {
    hasShortfall: true,
    firstShortfallDate: joshShortfall?.date,
    firstShortfallAmount: joshShortfall?.balance,
    dailySeries: joshBase,
    scenarios: {
      base: { dailySeries: joshBase },
      changed: { dailySeries: joshChanged },
    },
  };

  // ── Priya ──────────────────────────────────────────────────────────────────
  const priyaBase = series(today, 1200, [
    { day: 25, amount: -850 },
    { day: 28, amount: 1800 },
  ], 50, 35);

  const priyaChanged = series(today, 1200, [
    { day: 25, amount: -850 },
    { day: 28, amount: 1200 },
  ], 50, 35);

  const priyaForecast: BalanceForecast = {
    hasShortfall: false,
    dailySeries: priyaBase,
    scenarios: {
      base: { dailySeries: priyaBase },
      changed: { dailySeries: priyaChanged },
    },
  };

  const amiraShortfallAmt = Math.abs(amiraShortfall?.balance ?? 10);
  const rentShortfall = Math.abs(amiraBase[25]?.balance ?? 250);
  const rentShortfallB = Math.abs(amiraChanged[25]?.balance ?? 570);
  const joshShortfallAmt = Math.abs(joshShortfall?.balance ?? 205);
  const priyaAfterRent = priyaBase[25]?.balance ?? 350;
  const priyaAfterSalary = priyaBase[28]?.balance ?? 2150;

  return {
    "demo-amira": [
      // Q1 — Will I run short?
      {
        reply:
          `Yes — your balance dips below zero around **${fmt(add(today, 9))}**, when weekly essentials come out before wages arrive.\n\n` +
          `Here's the shape of the month:\n` +
          `• **Now → ${fmt(add(today, 7))}**: childcare of £120 drops your balance to about £25\n` +
          `• **${fmt(add(today, 14))}**: wages of £480 arrive — balance back up to ~£470\n` +
          `• **${fmt(add(today, 25))}**: rent of £650 pushes you to around **-£${rentShortfall}**\n\n` +
          `The chart above shows both your current plan (solid line) and what happens if you lose shifts (dashed). The good news: wages arrive before rent, giving you a brief window to prepare.\n\n` +
          `I've flagged some support below that could help cushion these gaps — Universal Credit tops up variable income, and your council may have emergency hardship funds.`,
        forecast: amiraForecast,
        sources: [UC, HSF],
      },
      // Q2 — What support?
      {
        reply:
          `Given your situation — zero-hours work and a child to care for — you may be entitled to more than you think:\n\n` +
          `• **Universal Credit** can top up variable income and includes a child element worth up to £290/month. If wages fluctuate, your UC payment adjusts automatically the following month.\n` +
          `• **Free School Meals** — if your child is school-age and you receive certain benefits, they may qualify automatically at no cost to you.\n` +
          `• **Council Tax Reduction** — many councils reduce or waive council tax for people on low incomes. Worth checking even if you think you don't qualify.\n` +
          `• **Household Support Fund** — your council can offer one-off grants for food, energy or essentials. No repayment required.\n` +
          `• **Citizens Advice** can run a full benefits check in 30 minutes — free and confidential. The Turn2us calculator is a good first step online.`,
        sources: [UC, TURN2US, CITIZENS_ADVICE, HSF],
      },
      // Q3 — Lost shifts
      {
        reply:
          `If your wages dropped from £480 to £200 this month — roughly losing two shifts — here's what changes:\n\n` +
          `• After wages, your balance would be around **£80** instead of £470\n` +
          `• Rent on ${fmt(add(today, 25))} then pushes you to around **-£${rentShortfallB}** instead of -£${rentShortfall}\n` +
          `• That's about **£${rentShortfallB - rentShortfall} more in the red**\n\n` +
          `The dashed line on the chart shows this scenario. Universal Credit is designed exactly for this — your payment automatically increases when earned income falls. If you're already claiming UC, this month's lower wages will lift next month's payment. If you're not claiming, losing shifts is a good reason to start now.\n\n` +
          `Even a small hardship grant (£150-200) from Citizens Advice or your council could make the difference this month.`,
        forecast: amiraForecast,
        sources: [UC, CITIZENS_ADVICE],
      },
    ],

    "demo-josh": [
      // Q1 — Loan shortfall
      {
        reply:
          `Yes, Josh — the numbers show you'll run out of money before your maintenance loan arrives on **${fmt(add(today, 45))}**.\n\n` +
          `Here's how it breaks down:\n` +
          `• **${fmt(add(today, 20))}**: rent of £480 goes out — your balance drops to around **-£${joshShortfallAmt}**\n` +
          `• **${fmt(add(today, 20))} → ${fmt(add(today, 45))}**: weekly essentials keep you in the red for about **${45 - 20} days**\n` +
          `• **Lowest point**: around -£${Math.abs(joshBase[45]?.balance ?? 305)} just before the loan arrives\n\n` +
          `The earlier you act, the more options you have. Your university's hardship fund can often pay out within a week — that's the first place to try. I've linked how to apply below.`,
        forecast: joshForecast,
        sources: [UNI_HARDSHIP, STUDENT_FINANCE],
      },
      // Q2 — Hardship funds
      {
        reply:
          `As a UK student, you have several targeted options — most people don't know all of them:\n\n` +
          `• **University Hardship Fund** — most UK universities have one. Apply through Student Services. Decisions often in 5-7 days. Usually does not have to be repaid.\n` +
          `• **Student Finance 'Extra Help'** — if you have dependants, a disability or other circumstances, additional non-repayable funding may be available.\n` +
          `• **Campus food banks** — most universities now have one. No formal application needed in most cases.\n` +
          `• **Short-term university loans** — interest-free, usually £200-500, specifically to bridge the gap before a maintenance loan arrives. Ask Student Services.\n\n` +
          `I'd suggest emailing Student Services today — explain the loan timing issue and ask about emergency funds. They deal with this regularly and are not there to judge.`,
        sources: [UNI_HARDSHIP, STUDENT_FINANCE, STUDENT_MINDS],
      },
      // Q3 — Safe daily spend
      {
        reply:
          `The honest answer: until your loan arrives on ${fmt(add(today, 45))}, there is no safe daily spend — your balance goes negative on ${fmt(add(today, 20))} and stays there.\n\n` +
          `Here's what actually helps:\n\n` +
          `1. **Apply for the hardship fund this week** — even £150-200 from your uni changes the picture significantly. The dashed line on the chart shows what an unexpected £150 cost does, to illustrate the sensitivity.\n` +
          `2. **If you get £200 from hardship**, your effective daily food budget becomes around £4-5 until the loan — tight but manageable with the campus food bank.\n` +
          `3. **Contact your landlord now** if you have one — many will give a short grace period if you explain the loan timing. Better to ask than miss a payment silently.\n\n` +
          `After your loan arrives on ${fmt(add(today, 45))}, your balance recovers fully. This is a **timing problem, not a structural one** — which means it's solvable.`,
        forecast: joshForecast,
        sources: [UNI_HARDSHIP, MONEY_HELPER],
      },
    ],

    "demo-priya": [
      // Q1 — Safe daily spend
      {
        reply:
          `Good news, Priya — you're in a comfortable position this month. Here's the full picture:\n\n` +
          `• **Now → ${fmt(add(today, 24))}**: with £1,200 and weekly essentials of ~£50, you can spend around **£45-50/day** safely\n` +
          `• **${fmt(add(today, 25))}**: rent of £850 goes out — balance drops briefly to ~£${priyaAfterRent}\n` +
          `• **${fmt(add(today, 28))}**: salary of £1,800 arrives — balance back up to ~£${priyaAfterSalary}\n\n` +
          `No shortfall risk this month. The chart shows the full 35-day shape. The dashed line shows the scenario where your salary came in £600 lower — still no crisis, which speaks to how solid your position is.`,
        forecast: priyaForecast,
        sources: [MONEY_HELPER],
      },
      // Q2 — Savings buffer
      {
        reply:
          `You're doing well. With a monthly surplus of around £900 (£1,800 salary minus rent and essentials), you have real room to build a buffer.\n\n` +
          `**Where you stand:**\n` +
          `A three-month emergency buffer — the standard recommendation — is roughly 3× your monthly essentials. For you, that's around **£2,500-3,000**. With your current balance of £1,200, you're almost halfway there already.\n\n` +
          `**Practical next steps:**\n` +
          `• Set up a **standing order for £200-300/month** to a separate easy-access savings account, timed for the day after salary arrives\n` +
          `• A Cash ISA or high-interest easy-access account (currently paying 4-5% AER) beats most current accounts\n` +
          `• At £250/month, you'd reach a full three-month buffer in **about 5 months**\n\n` +
          `The key is automating it — pay yourself first before spending, so the decision is already made.`,
        sources: [SAVINGS_GUIDE, MONEY_HELPER],
      },
      // Q3 — Unexpected £400 bill
      {
        reply:
          `A £400 unexpected cost this month is very manageable in your situation.\n\n` +
          `**Best case — bill arrives after salary on ${fmt(add(today, 28))}:**\n` +
          `Your balance would be ~£${priyaAfterSalary - 400} instead of ~£${priyaAfterSalary}. No shortfall, no stress.\n\n` +
          `**Worst case — bill arrives before salary, before rent:**\n` +
          `Your £1,200 covers the £400 comfortably. Even with rent on ${fmt(add(today, 25))}, you'd be at about -£${Math.abs(priyaAfterRent - 400)} temporarily — recovered fully the day your salary arrives.\n\n` +
          `**The nudge:** This scenario is exactly what an emergency fund absorbs without you even noticing. £400 is well within a three-month buffer — building that remains a great move, and you're on track to get there.`,
        forecast: priyaForecast,
        sources: [SAVINGS_GUIDE],
      },
    ],
  };
}
