import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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

function Index() {
  const [active, setActive] = useState<TopicId | null>(null);
  const [userId, setUserId] = useState<DemoUserId>("demo-amira");
  const [customFinance, setCustomFinance] = useState<CustomFinance | null>(null);
  /** A question handed to the chat from a topic box; the nonce lets the same one re-fire. */
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [forecast, setForecast] = useState<BalanceForecast | null>(null);

  const topic = topics.find((t) => t.id === active) ?? null;

  function ask(text: string) {
    setSeed((current) => ({ text, nonce: (current?.nonce ?? 0) + 1 }));
  }

  function startDemo() {
    setUserId("demo-amira");
    setCustomFinance(null);
    setForecast(null);
    setSeed({ text: "Will I run short before my next payday?", nonce: Date.now() });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="mx-auto grid w-full max-w-[1000px] flex-1 grid-cols-1 gap-8 px-5 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-16 md:px-8 md:py-14">
        <div className="flex flex-col gap-8 self-start md:sticky md:top-14">
          <Sidebar active={active} onSelect={setActive} />
          <PersonaPicker
            value={userId}
            onChange={(next) => {
              setUserId(next);
              setForecast(null);
              if (next !== "demo-me") setCustomFinance(null);
              // Auto-start a relevant question for each demo persona
              const autoQuestions: Record<string, string> = {
                "demo-amira": "Will I run short before my next payday?",
                "demo-josh": "Will I run out of money before my next student loan arrives?",
                "demo-priya": "How much can I safely spend each day until I'm paid?",
              };
              const q = autoQuestions[next];
              setSeed(q ? { text: q, nonce: Date.now() } : null);
            }}
            onCustomProfile={setCustomFinance}
          />
        </div>
        <main className="flex max-w-[660px] min-w-0 flex-col gap-12">
          {/* Demo launcher — one click kicks off a live Amira walkthrough */}
          <div className="flex items-center gap-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium">See it in action</p>
              <p className="text-xs text-muted-foreground">Watch FinBridge run a live payday forecast for Amira.</p>
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
          {/* Remounting on persona change starts a fresh session, so one profile's
              conversation never carries into another's numbers. */}
          <Chat
            key={userId}
            userId={userId}
            seed={seed}
            onForecast={setForecast}
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
