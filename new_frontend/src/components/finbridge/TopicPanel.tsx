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
    <section aria-live="polite">
      {topic ? (
        <>
          <h1 className="text-3xl md:text-4xl">{topic.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {topic.description}
          </p>
          <ul className="mt-6 border-t border-border">
            {topic.boxes.map((box) => (
              <li key={box.label} className="border-b border-border">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAsk(box.prompt)}
                  className="w-full py-2.5 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block">{box.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {box.prompt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h1 className="text-3xl text-balance md:text-4xl">
            Money help, in{" "}
            <span className="fb-accent-text">plain English.</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Ask below by typing or by voice, or choose a topic.
          </p>
        </>
      )}
    </section>
  );
}
