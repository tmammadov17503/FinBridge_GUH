import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AlertTriangle, Loader2, SendHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFinBridgeChat } from "@/hooks/useFinBridgeChat";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type {
  Channel,
  TranscriptMessage,
  VoiceKey,
} from "@/lib/finbridge/types";
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
 */
export interface ChatSeed {
  text: string;
  nonce: number;
}

export function Chat({
  userId,
  seed,
}: {
  userId: string;
  seed?: ChatSeed | null;
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

  const handleAgentMessage = useCallback(
    (message: TranscriptMessage, channel: Channel) => {
      // Speak when the toggle is on, and always speak the answer to a spoken question —
      // someone who just talked to the page is not watching it.
      if (!speakRepliesRef.current && channel !== "voice") return;
      void speech.speak({
        text: message.text,
        messageId: message.id,
        voice: voiceRef.current,
      });
    },
    [speech],
  );

  const chat = useFinBridgeChat({ userId, onAgentMessage: handleAgentMessage });
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
    void sendMessage(seed.text, { channel: "web" });
  }, [seed, sendMessage]);

  /** Keep the newest turn in view, without animating for people who asked us not to. */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Not every engine implements Element.scrollTo (jsdom and some embedded webviews do
    // not); assigning scrollTop still gets the newest turn on screen.
    if (typeof list.scrollTo === "function") {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }, [chat.messages, chat.pending, transcribing]);

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

  const onlyGreeting = chat.messages.length === 1;

  return (
    <section
      aria-label="FinBridge chat"
      className="flex min-h-[460px] flex-1 flex-col rounded-2xl border border-border bg-card"
    >
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
        }}
      />

      {banner ? (
        <div
          role="status"
          className="flex items-start gap-2 border-b border-lifeline/30 bg-lifeline/10 px-3 py-2 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-lifeline"
            aria-hidden
          />
          <p className="flex-1 text-foreground">{banner}</p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss this message"
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        ref={listRef}
        aria-live="polite"
        aria-atomic="false"
        aria-label="Conversation"
        className="flex max-h-[52vh] min-h-[220px] flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
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
          <p className="self-end text-xs text-muted-foreground">
            Transcribing what you said…
          </p>
        ) : null}

        {chat.pending ? (
          <div className="flex items-center gap-2 self-start rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            FinBridge is working it out…
          </div>
        ) : null}
      </div>

      {onlyGreeting ? (
        <div className="flex flex-wrap gap-2 px-3 pb-1">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => askSuggestion(question)}
              disabled={busy}
              className="rounded-full border border-input bg-background px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="flex items-end gap-2 border-t border-border p-3"
      >
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
              ? "Listening… stop talking when you're done"
              : "Ask about your money, or press the mic"
          }
          aria-label="Your question"
          disabled={recorder.isRecording}
          className={cn(
            "max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3",
            "text-foreground placeholder:text-muted-foreground disabled:opacity-70",
          )}
        />

        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          aria-label="Send your question"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {chat.pending ? (
            <Loader2
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <SendHorizontal className="h-5 w-5" aria-hidden />
          )}
        </button>
      </form>

      <p className="px-3 pb-3 text-xs text-muted-foreground">
        FinBridge explains figures worked out by its forecast engine and links
        only to checked support providers. It is not regulated financial advice,
        and eligibility is decided by each provider.
      </p>
    </section>
  );
}
