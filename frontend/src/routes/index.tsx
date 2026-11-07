import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { topics, type TopicId } from "@/data/topics";
import { HeaderCards } from "@/components/finbridge/HeaderCards";
import { Sidebar } from "@/components/finbridge/Sidebar";
import { TopicPanel } from "@/components/finbridge/TopicPanel";
import { Chat, type ChatSeed } from "@/components/finbridge/Chat";
import { PersonaPicker } from "@/components/finbridge/PersonaPicker";
import { NavBar } from "@/components/NavBar";
import type { BalanceForecast, DemoUserId } from "@/lib/finbridge/types";

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
  /** A question handed to the chat from a topic box; the nonce lets the same one re-fire. */
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [forecast, setForecast] = useState<BalanceForecast | null>(null);

  const topic = topics.find((t) => t.id === active) ?? null;

  function ask(text: string) {
    setSeed((current) => ({ text, nonce: (current?.nonce ?? 0) + 1 }));
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
              // The chat remounts for the new profile, so a kept seed would be asked again.
              setSeed(null);
            }}
          />
        </div>
        <main className="flex max-w-[660px] min-w-0 flex-col gap-12">
          <HeaderCards forecast={forecast} />
          <TopicPanel topic={topic} onAsk={ask} />
          {/* Remounting on persona change starts a fresh session, so one profile's
              conversation never carries into another's numbers. */}
          <Chat
            key={userId}
            userId={userId}
            seed={seed}
            onForecast={setForecast}
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
