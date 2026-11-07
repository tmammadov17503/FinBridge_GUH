import { AlertTriangle, Loader2, Mic, Square, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TranscriptMessage } from "@/lib/finbridge/types";
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
    <div
      className={cn(
        "flex w-full flex-col",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-3.5 py-2.5",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : message.failed
              ? "border-lifeline/40 bg-lifeline/10 text-foreground"
              : "border-border bg-background text-foreground",
        )}
      >
        {message.failed ? (
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-lifeline">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Couldn&apos;t answer
          </p>
        ) : null}

        <Paragraphs text={message.text} />

        {message.viaVoice ? (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <Mic className="h-3 w-3" aria-hidden />
            Asked by voice
          </p>
        ) : null}

        {message.suggestedNextStep ? (
          <p className="mt-2.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold">Next step: </span>
            {message.suggestedNextStep}
          </p>
        ) : null}

        {/* Drafts are for the user to review and send themselves — never sent on their behalf. */}
        {message.editableDraft ? (
          <div className="mt-2.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Draft for you to edit and send
            </p>
            <textarea
              defaultValue={message.editableDraft}
              rows={4}
              aria-label="Draft message you can edit"
              className="w-full resize-y rounded-xl border border-input bg-card p-2 text-sm text-foreground"
            />
          </div>
        ) : null}

        {message.sources?.length ? (
          <SourceCards sources={message.sources} />
        ) : null}
      </div>

      {!isUser && !message.failed && canSpeak ? (
        <button
          type="button"
          onClick={isSpeaking ? onStopSpeaking : onSpeak}
          disabled={isPreparing}
          className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
          aria-label={
            isSpeaking
              ? "Stop reading this reply aloud"
              : "Read this reply aloud"
          }
        >
          {isPreparing ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : isSpeaking ? (
            <Square className="h-3 w-3 fill-current" aria-hidden />
          ) : (
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {isPreparing ? "Preparing…" : isSpeaking ? "Stop" : "Read aloud"}
        </button>
      ) : null}
    </div>
  );
}
