import { cn } from "@/lib/utils";
import type { TranscriptMessage } from "@/lib/finbridge/types";
import { BalanceChart } from "./BalanceChart";
import { SourceCards } from "./SourceCards";

/** Agent replies arrive as plain prose with blank-line paragraphs; keep those breaks. */
function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n{2,}/).filter((part) => part.trim().length > 0);
  if (parts.length <= 1) return <p className="whitespace-pre-wrap">{text}</p>;
  return (
    <div className="flex flex-col gap-2">
      {parts.map((part, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {part}
        </p>
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  isSpeaking,
  isPreparing,
  canSpeak,
  onSpeak,
  onStopSpeaking,
}: {
  message: TranscriptMessage;
  isSpeaking: boolean;
  isPreparing: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
  onStopSpeaking: () => void;
}) {
  const isUser = message.author === "user";

  return (
    <div>
      <p className="mb-0.5 text-sm text-muted-foreground">
        {isUser ? "You" : "FinBridge"}
        {message.viaVoice ? " · asked by voice" : ""}
      </p>

      <div className={cn(message.failed && "text-destructive")}>
        {message.failed ? (
          <p className="text-sm font-medium">Couldn&apos;t answer</p>
        ) : null}
        <Paragraphs text={message.text} />
      </div>

      {message.forecast ? <BalanceChart forecast={message.forecast} /> : null}

      {message.suggestedNextStep ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">Next step: </span>
          {message.suggestedNextStep}
        </p>
      ) : null}

      {/* Drafts are for the user to review and send themselves — never sent on their behalf. */}
      {message.editableDraft ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">
            Draft for you to edit and send
          </p>
          <textarea
            defaultValue={message.editableDraft}
            rows={4}
            aria-label="Draft message you can edit"
            className="w-full resize-y rounded-md border border-input bg-background p-2.5 text-sm text-foreground"
          />
        </div>
      ) : null}

      {message.sources?.length ? (
        <SourceCards sources={message.sources} />
      ) : null}

      {!isUser && !message.failed && canSpeak ? (
        <button
          type="button"
          onClick={isSpeaking ? onStopSpeaking : onSpeak}
          disabled={isPreparing}
          className="mt-1 min-h-9 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60"
          aria-label={
            isSpeaking
              ? "Stop reading this reply aloud"
              : "Read this reply aloud"
          }
        >
          {isPreparing ? "Preparing…" : isSpeaking ? "Stop" : "Read aloud"}
        </button>
      ) : null}
    </div>
  );
}
