import { cn } from "@/lib/utils";
import { VOICE_CHOICES, type VoiceKey } from "@/lib/finbridge/types";

/** A small text toggle, used for the two voice switches. */
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
        "min-h-9 rounded-md border px-2.5 text-sm",
        on
          ? "border-link text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Toggle
        on={speakReplies}
        onChange={onSpeakRepliesChange}
        label="Read replies aloud"
        title="Read each reply aloud as it arrives"
      >
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
          Hands-free
        </Toggle>
      ) : null}

      <select
        value={voice}
        onChange={(event) => onVoiceChange(event.target.value as VoiceKey)}
        aria-label="Choose the reply voice"
        className="min-h-9 min-w-0 rounded-md border border-border bg-background px-1.5 text-sm text-muted-foreground"
      >
        {VOICE_CHOICES.map((choice) => (
          <option key={choice.key} value={choice.key}>
            {choice.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto min-h-9 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        title="Clear this conversation and start a new session"
      >
        New chat
      </button>
    </div>
  );
}
