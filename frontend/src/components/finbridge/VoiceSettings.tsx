import { Headphones, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { VOICE_CHOICES, type VoiceKey } from "@/lib/finbridge/types";

/** A small pill toggle, used for the two voice switches. */
function Toggle({
  on,
  onChange,
  label,
  title,
  children,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function VoiceSettings({
  speakReplies,
  onSpeakRepliesChange,
  handsFree,
  onHandsFreeChange,
  voice,
  onVoiceChange,
  voiceSupported,
  onReset,
}: {
  speakReplies: boolean;
  onSpeakRepliesChange: (next: boolean) => void;
  handsFree: boolean;
  onHandsFreeChange: (next: boolean) => void;
  voice: VoiceKey;
  onVoiceChange: (next: VoiceKey) => void;
  voiceSupported: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <Toggle
        on={speakReplies}
        onChange={onSpeakRepliesChange}
        label="Read replies aloud"
        title="Read each reply aloud as it arrives"
      >
        {speakReplies ? (
          <Volume2 className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <VolumeX className="h-3.5 w-3.5" aria-hidden />
        )}
        {speakReplies ? "Voice on" : "Voice off"}
      </Toggle>

      {voiceSupported ? (
        <Toggle
          on={handsFree}
          onChange={(next) => {
            onHandsFreeChange(next);
            // Hands-free is pointless without spoken replies, so turn them on together.
            if (next) onSpeakRepliesChange(true);
          }}
          label="Hands-free conversation"
          title="After each spoken reply, start listening again automatically"
        >
          <Headphones className="h-3.5 w-3.5" aria-hidden />
          Hands-free
        </Toggle>
      ) : null}

      <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="sr-only sm:not-sr-only">Voice</span>
        <select
          value={voice}
          onChange={(event) => onVoiceChange(event.target.value as VoiceKey)}
          aria-label="Choose the reply voice"
          className="min-h-9 rounded-full border border-input bg-background px-2.5 text-xs text-foreground"
        >
          {VOICE_CHOICES.map((choice) => (
            <option key={choice.key} value={choice.key}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title="Clear this conversation and start a new session"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        New chat
      </button>
    </div>
  );
}
