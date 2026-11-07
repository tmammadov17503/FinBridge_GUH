import type { Topic } from "@/data/topics";
import { Placeholder } from "./Placeholder";

export function TopicPanel({ topic }: { topic: Topic | null }) {
  return (
    <section aria-live="polite" className="rounded-2xl border border-border bg-card p-5">
      {topic ? (
        <>
          <h2 className="text-xl font-bold">{topic.title}</h2>
          <p className="text-muted-foreground">{topic.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {topic.boxes.map((b) => (
              <Placeholder key={b} label={b} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Welcome</h2>
          <p className="text-muted-foreground">Pick a topic on the left, or ask the chat bot below.</p>
        </>
      )}
    </section>
  );
}
