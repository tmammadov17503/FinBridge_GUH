import { Loader2, Mic, Square } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Push-to-talk control.
 *
 * Click to start, click to stop. The ring around the button tracks the live mic level, so it
 * is obvious that something is being heard before the transcript appears — the usual failure
 * with voice input is silence that looks identical to success.
 */
export function MicButton({
  isRecording,
  isBusy,
  level,
  elapsedMs,
  disabled,
  onToggle,
}: {
  isRecording: boolean;
  isBusy: boolean;
  level: number;
  elapsedMs: number;
  disabled?: boolean;
  onToggle: () => void;
}) {
  // Grow the ring with the mic level, with a floor so it never looks dead while recording.
  const ringScale = 1 + Math.min(level, 1) * 0.45;
  const seconds = Math.floor(elapsedMs / 1000);

  return (
    <div className="relative flex shrink-0 items-center">
      {isRecording ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lifeline/25 transition-transform duration-75 motion-reduce:transition-none"
          style={{ transform: `translate(-50%, -50%) scale(${ringScale})` }}
        />
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isBusy}
        aria-pressed={isRecording}
        aria-label={
          isRecording
            ? `Stop recording (${seconds} seconds). Your question will be sent.`
            : "Ask by voice"
        }
        className={cn(
          "relative grid h-12 w-12 place-items-center rounded-full border transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isRecording
            ? "border-lifeline bg-lifeline text-lifeline-foreground"
            : "border-input bg-background text-foreground hover:bg-accent",
        )}
      >
        {isBusy ? (
          <Loader2
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : isRecording ? (
          <Square className="h-4 w-4 fill-current" aria-hidden />
        ) : (
          <Mic className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
