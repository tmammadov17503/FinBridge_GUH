import { MessageSquare } from "lucide-react";

import type { Topic } from "@/data/topics";

/**
 * The panel beside the chat. Each box is a shortcut that asks the agent the question for you,
 * so a topic choice turns into a real conversation rather than an empty placeholder.
 */
export function TopicPanel({
  topic,
  onAsk,
  disabled,
}: {
  topic: Topic | null;
  onAsk: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-border bg-card p-5"
    >
      {topic ? (
        <>
          <h2 className="text-xl font-bold">{topic.title}</h2>
          <p className="text-muted-foreground">{topic.description}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topic.boxes.map((box) => (
              <button
                key={box.label}
                type="button"
                disabled={disabled}
                onClick={() => onAsk(box.prompt)}
                title={box.prompt}
                className="group flex min-h-12 flex-col gap-1 rounded-xl border border-input bg-background p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <MessageSquare
                    className="h-3.5 w-3.5 text-primary opacity-70"
                    aria-hidden
                  />
                  {box.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {box.prompt}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Welcome</h2>
          <p className="text-muted-foreground">
            Pick a topic on the left, or ask the chat below — by typing or by
            voice.
          </p>
        </>
      )}
    </section>
  );
}
