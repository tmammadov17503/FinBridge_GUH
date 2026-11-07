import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { askFinBridge, type FinBridgeResponse, type SupportSource } from "@/lib/finbridge-api";

type UserMessage = { id: number; from: "me"; text: string };
type BotMessage = {
  id: number;
  from: "bot";
  text: string;
  response?: FinBridgeResponse;
  isError?: boolean;
};
type Message = UserMessage | BotMessage;

let nextId = 1;

function SourceCard({ source }: { source: SupportSource }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-semibold">{source.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{source.provider}</p>
      <p className="mt-1 text-xs">{source.summary}</p>
      <p className="mt-1 text-xs italic text-muted-foreground">{source.caution}</p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        {source.actionLabel} ↗
      </a>
    </div>
  );
}

function BotBubble({ msg }: { msg: BotMessage }) {
  const r = msg.response;
  return (
    <div className="max-w-[90%] self-start space-y-2">
      <div
        className={cn(
          "rounded-2xl border px-3 py-2 text-sm",
          msg.isError
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-background",
        )}
      >
        {msg.text}
        {r?.draftStatus === "fallback" && (
          <p className="mt-1 text-xs text-muted-foreground">
            (General guidance — AI classification unavailable)
          </p>
        )}
      </div>

      {r?.supportStatus === "unavailable" && (
        <p className="px-1 text-xs text-muted-foreground">
          Support sources temporarily unavailable.
        </p>
      )}

      {r?.supportStatus === "ok" && r.supportSources.length > 0 && (
        <div className="space-y-2">
          {r.supportSources.map((s) => (
            <SourceCard key={s.id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: "bot",
      text: "Hi, I'm FinBridge. What would you like help with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    setMessages((m) => [...m, { id: nextId++, from: "me", text }]);
    setLoading(true);

    const result = await askFinBridge(text);
    setLoading(false);

    if (result.ok) {
      setMessages((m) => [
        ...m,
        {
          id: nextId++,
          from: "bot",
          text: result.data.explanation,
          response: result.data,
        },
      ]);
    } else {
      let errorText = "Something went wrong — please try again.";
      if (result.status === 400) {
        errorText = "Invalid request — please rephrase your question.";
      } else if (result.error.message) {
        errorText = result.error.message;
      }
      setMessages((m) => [
        ...m,
        { id: nextId++, from: "bot", text: errorText, isError: true },
      ]);
    }
  }

  return (
    <section
      aria-label="Chat bot"
      className="flex min-h-[340px] flex-1 flex-col rounded-2xl border border-border bg-card"
    >
      <h2 className="pt-3 text-center text-base font-bold">Chat bot</h2>
      <div
        ref={listRef}
        aria-live="polite"
        className="flex max-h-[420px] flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
      >
        {messages.map((m) =>
          m.from === "me" ? (
            <div
              key={m.id}
              className="max-w-[80%] self-end rounded-2xl border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              {m.text}
            </div>
          ) : (
            <BotBubble key={m.id} msg={m as BotMessage} />
          ),
        )}
        {loading && (
          <div className="max-w-[80%] self-start rounded-2xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
      <form onSubmit={send} className="flex gap-3 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask FinBridge anything"
          aria-label="Your question"
          autoComplete="off"
          disabled={loading}
          className="min-h-12 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
