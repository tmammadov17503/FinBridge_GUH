import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { topics, type TopicId } from "@/data/topics";
import { HeaderCards } from "@/components/finbridge/HeaderCards";
import { Sidebar } from "@/components/finbridge/Sidebar";
import { TopicPanel } from "@/components/finbridge/TopicPanel";
import { Chat, type ChatSeed } from "@/components/finbridge/Chat";
import { PersonaPicker } from "@/components/finbridge/PersonaPicker";
import { NavBar } from "@/components/NavBar";
import type { BalanceForecast, CustomFinance, DemoUserId } from "@/lib/finbridge/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinBridge — Financial coaching" },
      {
        name: "description",
        content:
          "Plain-language help with money worries, by chat or voice: whether you'll run short before payday, and what you can do about it today.",
      },
      { property: "og:title", content: "FinBridge — Financial coaching" },
      {
        property: "og:description",
        content:
          "Plain-language help with money worries, by chat or voice: whether you'll run short before payday, and what you can do about it today.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

interface DemoStep {
  text: string;
  /** If set, this step is added locally (no API call) — used for the thank-you finale. */
  cannedReply?: string;
}

/** Per-persona demo walkthrough: first question fires on click, followups queue up. */
const DEMO_SCRIPTS: Record<string, { first: string; followups: DemoStep[] }> = {
  "demo-amira": {
    first: "Will I run short before my next payday?",
    followups: [
      { text: "What support could I apply for right now?" },
      { text: "What would happen if I lost two of my shifts this month?" },
      {
        text: "Thank you so much — I had no idea I could access some of these!",
        cannedReply:
          "You're so welcome, Amira! It's worth contacting those schemes this week — some have rolling deadlines. Feel free to come back any time you have money questions.",
      },
    ],
  },
  "demo-josh": {
    first: "Will I run out of money before my next student loan arrives?",
    followups: [
      { text: "Are there any hardship funds I could apply for as a student?" },
      { text: "How much can I safely spend each day until my loan comes in?" },
      {
        text: "This is brilliant, thanks — I didn't realise my uni had these funds!",
        cannedReply:
          "Really glad I could help! Get that hardship fund application in this week if you can — they process quickly. Come back any time you need a hand with the numbers.",
      },
    ],
  },
  "demo-priya": {
    first: "How much can I safely spend each day until I'm paid?",
    followups: [
      { text: "Am I building up a good enough savings buffer?" },
      { text: "What would an unexpected £400 bill do to my finances this month?" },
      {
        text: "Really clear breakdown, thank you — that gives me real peace of mind!",
        cannedReply:
          "My pleasure, Priya! You're in a solid position — just keep that buffer top of mind. Come back any time for a fresh look at the numbers.",
      },
    ],
  },
};

function Index() {
  const [active, setActive] = useState<TopicId | null>(null);
  const [userId, setUserId] = useState<DemoUserId>("demo-amira");
  const [customFinance, setCustomFinance] = useState<CustomFinance | null>(null);
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [forecast, setForecast] = useState<BalanceForecast | null>(null);

  /** Stable ref so the agent-reply callback always sees the latest queue without re-creating. */
  const demoQueueRef = useRef<DemoStep[]>([]);

  const topic = topics.find((t) => t.id === active) ?? null;

  function ask(text: string) {
    setSeed((current) => ({ text, nonce: (current?.nonce ?? 0) + 1 }));
  }

  /** Called by Chat after each agent reply — fires the next demo question after a short pause. */
  function handleAgentReply() {
    const queue = demoQueueRef.current;
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    demoQueueRef.current = rest;
    setTimeout(() => {
      setSeed({ text: next!.text, nonce: Date.now(), cannedReply: next!.cannedReply });
    }, 1200);
  }

  function handlePersonaChange(next: DemoUserId) {
    setUserId(next);
    setForecast(null);
    if (next !== "demo-me") setCustomFinance(null);

    const script = DEMO_SCRIPTS[next];
    if (script) {
      demoQueueRef.current = script.followups;
      setSeed({ text: script.first, nonce: Date.now() });
    } else {
      demoQueueRef.current = [];
      setSeed(null);
    }
  }

  /** When the user submits their own numbers, format them into a natural message and fire it. */
  function handleCustomProfile(profile: CustomFinance) {
    setCustomFinance(profile);
    demoQueueRef.current = [];

    const dateStr = new Date(profile.nextIncomeDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
    const msg =
      `Hi! Here's my current situation: I have £${profile.balance} in my account right now. ` +
      `My next income of £${profile.nextIncomeAmount} arrives on ${dateStr}. ` +
      `I pay about £${profile.monthlyBills} a month in rent and bills, and spend roughly ` +
      `£${profile.weeklySpend} a week on food and daily essentials. ` +
      `Will I run short before my next income arrives?`;

    setSeed({ text: msg, nonce: Date.now() });
  }

  function startDemo() {
    handlePersonaChange("demo-amira");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="mx-auto grid w-full max-w-[1000px] flex-1 grid-cols-1 gap-8 px-5 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-16 md:px-8 md:py-14">
        <div className="flex flex-col gap-8 self-start md:sticky md:top-14">
          <Sidebar active={active} onSelect={setActive} />
          <PersonaPicker
            value={userId}
            onChange={handlePersonaChange}
            onCustomProfile={handleCustomProfile}
          />
        </div>
        <main className="flex max-w-[660px] min-w-0 flex-col gap-12">
          {/* Demo launcher */}
          <div className="flex items-center gap-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium">See it in action</p>
              <p className="text-xs text-muted-foreground">
                Watch FinBridge run a live walkthrough for Amira.
              </p>
            </div>
            <button
              type="button"
              onClick={startDemo}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              ▶ Start demo
            </button>
          </div>
          <HeaderCards forecast={forecast} />
          <TopicPanel topic={topic} onAsk={ask} />
          <Chat
            key={userId}
            userId={userId}
            seed={seed}
            onForecast={setForecast}
            onAgentReply={handleAgentReply}
            customFinance={customFinance}
          />
        </main>
      </div>
      <footer className="mx-auto w-full max-w-[1000px] px-5 md:px-8">
        <p className="border-t border-border py-5 text-sm text-muted-foreground">
          Prototype. Guidance only, not regulated financial advice.
        </p>
      </footer>
    </div>
  );
}
