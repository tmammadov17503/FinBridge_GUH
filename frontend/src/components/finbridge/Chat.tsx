import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useFinBridgeChat } from "@/hooks/useFinBridgeChat";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type {
  BalanceForecast,
  Channel,
  CustomFinance,
  TranscriptMessage,
  VoiceKey,
} from "@/lib/finbridge/types";
import type { CannedAnswer } from "@/data/demo-canned";
import { MessageBubble } from "./MessageBubble";
import { MicButton } from "./MicButton";
import { VoiceSettings } from "./VoiceSettings";

/**
 * The chat and voice front door.
 *
 * Both input paths converge on one transcript and one n8n session: typing posts straight to
 * `/api/chat`, while the microphone adds a transcription step in front of the same call. The
 * `channel` flag tells the agent which it was, so spoken answers come back short enough to
 * listen to.
 */

const SUGGESTIONS = [
  "Will I run short before my next payday?",
  "What happens if I lose two shifts this month?",
  "What support could I apply for right now?",
  "How much can I safely spend a day until I'm paid?",
];

/**
 * A question handed in from the topic panel. The `nonce` is what makes it re-fire, so asking
 * the same question twice works without smuggling a marker into the message text.
 * When `cannedReply` is set the message is added locally — no API call — so demo finales
 * don't trigger another forecast from n8n.
 */
export interface ChatSeed {
  text: string;
  nonce: number;
  /** Simple finale: add both messages locally, no forecast. */
  cannedReply?: string;
  /** Full pre-made answer: add locally with forecast + sources. */
  canned?: CannedAnswer;
}

export function Chat({
  userId,
  seed,
  onForecast,
  onAgentReply,
  customFinance,
}: {
  userId: string;
  seed?: ChatSeed | null;
  onForecast?: (forecast: BalanceForecast | null) => void;
  /** Called after every agent reply — used by the demo sequence to fire the next question. */
  onAgentReply?: () => void;
  customFinance?: CustomFinance | null;
}) {
  const [input, setInput] = useState("");
  const [speakReplies, setSpeakReplies] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voice, setVoice] = useState<VoiceKey>("lily");
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Read inside callbacks that must not be re-created when these toggles change. */
  const speakRepliesRef = useRef(speakReplies);
  speakRepliesRef.current = speakReplies;
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const speech = useSpeech({
    onFinished: () => {
      // Hands-free: the reply has finished playing, so open the mic for the next turn.
      if (handsFreeRef.current) startRecordingRef.current?.();
    },
  });

  const onAgentReplyRef = useRef(onAgentReply);
  onAgentReplyRef.current = onAgentReply;

  const handleAgentMessage = useCallback(
    (message: TranscriptMessage, channel: Channel) => {
      if (message.forecast) onForecast?.(message.forecast);
      onAgentReplyRef.current?.();
      if (!speakRepliesRef.current && channel !== "voice") return;
      void speech.speak({
        text: message.text,
        messageId: message.id,
        voice: voiceRef.current,
      });
    },
    [speech, onForecast],
  );

  const chat = useFinBridgeChat({ userId, customFinance, onAgentMessage: handleAgentMessage });
  const { send: sendMessage } = chat;

  /** Transcribe the clip, then send it down the ordinary chat path. */
  const handleClip = useCallback(
    async (clip: Blob) => {
      setTranscribing(true);
      setVoiceError(null);
      try {
        const form = new FormData();
        const extension = clip.type.includes("mp4") ? "mp4" : "webm";
        form.set("audio", clip, `question.${extension}`);

        const response = await fetch("/api/voice/stt", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json().catch(() => null)) as {
          text?: string;
          error?: string;
        } | null;

        if (!response.ok || !payload?.text) {
          setVoiceError(
            payload?.error ?? "Could not understand that recording.",
          );
          return;
        }
        await sendMessage(payload.text, { viaVoice: true, channel: "voice" });
      } catch {
        setVoiceError(
          "Could not reach the transcription service. You can type instead.",
        );
      } finally {
        setTranscribing(false);
      }
    },
    [sendMessage],
  );

  const recorder = useVoiceRecorder({ onClip: handleClip });

  /** Lets `useSpeech`'s completion callback reopen the mic without a circular dependency. */
  const startRecordingRef = useRef<(() => void) | null>(null);
  startRecordingRef.current = () => {
    if (!recorder.supported || chat.pending || transcribing) return;
    void recorder.start();
  };

  /** A topic button on the left can drop a question straight into the conversation. */
  const lastSeedNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!seed || seed.nonce === lastSeedNonceRef.current) return;
    lastSeedNonceRef.current = seed.nonce;
    if (seed.canned) {
      chat.addLocal(seed.text, seed.canned.reply, {
        forecast: seed.canned.forecast,
        sources: seed.canned.sources,
      });
      onForecast?.(seed.canned.forecast ?? null);
      onAgentReplyRef.current?.();
    } else if (seed.cannedReply) {
      chat.addLocal(seed.text, seed.cannedReply);
      onAgentReplyRef.current?.();
    } else {
      void sendMessage(seed.text, { channel: "web" });
    }
  }, [seed, sendMessage, chat, onForecast]);

  const onlyGreeting = chat.messages.length === 1;

  /**
   * Bring the start of the newest turn into view if it's off screen or near the bottom:
   * answers lead with the forecast, so that's the part to show. Never on the first paint,
   * and without animating for people who asked us not to.
   */
  useLayoutEffect(() => {
    if (onlyGreeting) return;
    const last = listRef.current?.lastElementChild;
    if (!last) return;
    const { top } = last.getBoundingClientRect();
    if (top >= 0 && top <= window.innerHeight * 0.7) return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: window.scrollY + top - 16,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [chat.messages, chat.pending, transcribing, onlyGreeting]);

  const busy = chat.pending || transcribing;

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    speech.stop();
    void sendMessage(text, { channel: "web" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a newline, as in every other chat box.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(event as unknown as FormEvent);
    }
  }

  function askSuggestion(question: string) {
    if (busy) return;
    speech.stop();
    void sendMessage(question, { channel: "web" });
    inputRef.current?.focus();
  }

  function toggleMic() {
    setVoiceError(null);
    recorder.clearError();
    // Don't talk over ourselves: cut the spoken reply when the user starts speaking.
    if (!recorder.isRecording) speech.stop();
    recorder.toggle();
  }

  const banner = voiceError ?? recorder.error ?? speech.error ?? chat.error;
  const dismissBanner = () => {
    setVoiceError(null);
    recorder.clearError();
    speech.clearError();
    chat.clearError();
  };

  return (
    <section aria-labelledby="chat-heading">
      <h2 id="chat-heading" className="text-xl">
        Ask FinBridge
      </h2>

      <div
        ref={listRef}
        aria-live="polite"
        aria-atomic="false"
        aria-label="Conversation"
        className="mt-4 flex flex-col gap-5"
      >
        {chat.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isSpeaking={speech.speakingId === message.id}
            isPreparing={speech.preparingId === message.id}
            canSpeak
            onSpeak={() =>
              void speech.speak({
                text: message.text,
                messageId: message.id,
                voice,
              })
            }
            onStopSpeaking={speech.stop}
          />
        ))}

        {transcribing ? (
          <p className="text-muted-foreground">Transcribing what you said…</p>
        ) : null}

        {chat.pending ? (
          <p className="text-muted-foreground">FinBridge is working it out…</p>
        ) : null}
      </div>

      {onlyGreeting ? (
        <div className="mt-3 flex flex-col items-start">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => askSuggestion(question)}
              disabled={busy}
              className="min-h-9 text-left text-primary underline underline-offset-2 hover:no-underline disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}

      {banner ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 border-l-2 border-destructive pl-3 text-sm"
        >
          <p className="flex-1 text-foreground">{banner}</p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss this message"
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-5 flex items-end gap-2">
        {recorder.supported ? (
          <MicButton
            isRecording={recorder.isRecording}
            isBusy={recorder.isBusy}
            level={recorder.level}
            elapsedMs={recorder.elapsedMs}
            disabled={busy}
            onToggle={toggleMic}
          />
        ) : null}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1200}
          placeholder={
            recorder.isRecording
              ? "Listening… press stop when you're done"
              : "Ask about your money"
          }
          aria-label="Your question"
          disabled={recorder.isRecording}
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2.5 leading-snug text-foreground placeholder:text-muted-foreground disabled:opacity-70"
        />

        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          aria-label="Send your question"
          className="min-h-11 shrink-0 rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <VoiceSettings
        speakReplies={speakReplies}
        onSpeakRepliesChange={(next) => {
          setSpeakReplies(next);
          if (!next) {
            speech.stop();
            setHandsFree(false);
          }
        }}
        handsFree={handsFree}
        onHandsFreeChange={setHandsFree}
        voice={voice}
        onVoiceChange={(next) => {
          setVoice(next);
          speech.stop();
        }}
        voiceSupported={recorder.supported}
        onReset={() => {
          speech.stop();
          if (recorder.isRecording) recorder.stop();
          setHandsFree(false);
          setInput("");
          dismissBanner();
          chat.reset();
          onForecast?.(null);
        }}
      />

      <p className="mt-3 text-sm text-muted-foreground">
        Demo only: answers use sample figures, not your own. Please don&apos;t
        type or say personal details. FinBridge links only to checked support
        providers, and eligibility is decided by each provider.
      </p>
    </section>
  );
}
