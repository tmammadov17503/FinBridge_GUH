import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  from: "me" | "bot";
  text: string;
}

let nextId = 1;

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: "bot", text: "Hi, I'm FinBridge. What would you like help with today?" },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    // TODO: connect chatbot — replace this hardcoded reply with the real chatbot call.
    const reply = `Placeholder reply. You asked: "${text}"`;
    setMessages((m) => [
      ...m,
      { id: nextId++, from: "me", text },
      { id: nextId++, from: "bot", text: reply },
    ]);
  }

  return (
    <section aria-label="Chat bot" className="flex min-h-[340px] flex-1 flex-col rounded-2xl border border-border bg-card">
      <h2 className="pt-3 text-center text-base font-bold">Chat bot</h2>
      <div ref={listRef} aria-live="polite" className="flex max-h-[420px] flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl border px-3 py-2",
              m.from === "me"
                ? "self-end border-primary bg-primary text-primary-foreground"
                : "self-start border-border bg-background",
            )}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-3 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask FinBridge anything"
          aria-label="Your question"
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-foreground placeholder:text-muted-foreground"
        />
        <button type="submit" className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90">
          Send
        </button>
      </form>
    </section>
  );
}
