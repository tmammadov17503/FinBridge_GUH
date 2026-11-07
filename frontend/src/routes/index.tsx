import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { topics, type TopicId } from "@/data/topics";
import { HeaderCards } from "@/components/finbridge/HeaderCards";
import { Sidebar } from "@/components/finbridge/Sidebar";
import { TopicPanel } from "@/components/finbridge/TopicPanel";
import { Chat, type ChatSeed } from "@/components/finbridge/Chat";
import { PersonaPicker } from "@/components/finbridge/PersonaPicker";
import { ThemeToggle } from "@/components/finbridge/ThemeToggle";
import type { DemoUserId } from "@/lib/finbridge/types";

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

  const topic = topics.find((t) => t.id === active) ?? null;

  function ask(text: string) {
    setSeed((current) => ({ text, nonce: (current?.nonce ?? 0) + 1 }));
  }

  return (
    <div className="min-h-screen">
      <div className="bg-header-bar">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
          <h1 className="font-serif text-2xl font-bold text-header-bar-foreground">
            FinBridge
          </h1>
          <ThemeToggle />
        </div>
      </div>
      <div className="h-1 bg-primary" />
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-5 p-5 md:grid-cols-[280px_1fr]">
        <div className="hidden md:block" />
        <HeaderCards />
        <div className="flex flex-col gap-4">
          <Sidebar active={active} onSelect={setActive} />
          <PersonaPicker value={userId} onChange={setUserId} />
        </div>
        <main className="flex min-w-0 flex-col gap-4">
          <TopicPanel topic={topic} onAsk={ask} />
          {/* Remounting on persona change starts a fresh session, so one profile's
              conversation never carries into another's numbers. */}
          <Chat key={userId} userId={userId} seed={seed} />
        </main>
        <p className="text-xs text-muted-foreground md:hidden">
          Prototype. Guidance only, not regulated financial advice.
        </p>
      </div>
    </div>
  );
}
