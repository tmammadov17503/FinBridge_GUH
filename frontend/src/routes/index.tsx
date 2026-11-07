import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { topics, type TopicId } from "@/data/topics";
import { HeaderCards } from "@/components/finbridge/HeaderCards";
import { Sidebar } from "@/components/finbridge/Sidebar";
import { TopicPanel } from "@/components/finbridge/TopicPanel";
import { Chat } from "@/components/finbridge/Chat";
import { ThemeToggle } from "@/components/finbridge/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinBridge — Financial coaching" },
      { name: "description", content: "Plain-language help with careers, money worries and support you can get." },
      { property: "og:title", content: "FinBridge — Financial coaching" },
      { property: "og:description", content: "Plain-language help with careers, money worries and support you can get." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [active, setActive] = useState<TopicId | null>(null);
  const topic = topics.find((t) => t.id === active) ?? null;

  return (
    <div className="min-h-screen">
    <div className="bg-header-bar">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <h1 className="font-serif text-2xl font-bold text-header-bar-foreground">FinBridge</h1>
        <ThemeToggle />
      </div>
    </div>
    <div className="h-1 bg-primary" />
    <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-5 p-5 md:grid-cols-[280px_1fr]">
      <div className="hidden md:block" />
      <HeaderCards />
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex min-w-0 flex-col gap-4">
        <TopicPanel topic={topic} />
        <Chat />
      </main>
      <p className="text-xs text-muted-foreground md:hidden">
        Prototype. Guidance only, not regulated financial advice.
      </p>
    </div>
    </div>
  );
}
