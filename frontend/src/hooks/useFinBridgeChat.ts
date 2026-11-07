import { useCallback, useRef, useState } from "react";

import type {
  Channel,
  ChatResponse,
  TranscriptMessage,
} from "@/lib/finbridge/types";

/**
 * The conversation itself: one transcript, one session, whether a turn arrived by keyboard
 * or by microphone. `channel` is passed through to n8n, which answers in 2-4 spoken-style
 * sentences for `"voice"` and at normal length for `"web"`.
 */

const GREETING: TranscriptMessage = {
  id: "greeting",
  author: "agent",
  text:
    "Hi, I'm FinBridge. I can look at whether your money runs short before your next payday, " +
    "and point you to support you might be able to get. What's on your mind?",
  at: 0,
};

function newId(prefix: string): string {
  // crypto.randomUUID is unavailable over plain http on some browsers; fall back quietly.
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

interface Options {
  userId: string;
  /** Called with each new agent message, so the caller can decide whether to speak it. */
  onAgentMessage?: (message: TranscriptMessage, channel: Channel) => void;
}

export function useFinBridgeChat({ userId, onAgentMessage }: Options) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Stable per browser session so n8n's memory node keeps the thread. */
  const sessionIdRef = useRef<string>(
    newId("s").replace(/[^a-zA-Z0-9_-]/g, ""),
  );
  const onAgentMessageRef = useRef(onAgentMessage);
  onAgentMessageRef.current = onAgentMessage;
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    setMessages([GREETING]);
    setError(null);
    sessionIdRef.current = newId("s").replace(/[^a-zA-Z0-9_-]/g, "");
  }, []);

  const send = useCallback(
    async (
      rawText: string,
      options: { channel?: Channel; viaVoice?: boolean } = {},
    ) => {
      const text = rawText.trim();
      if (!text || inFlightRef.current) return;

      const channel: Channel =
        options.channel ?? (options.viaVoice ? "voice" : "web");

      inFlightRef.current = true;
      setPending(true);
      setError(null);
      setMessages((current) => [
        ...current,
        {
          id: newId("u"),
          author: "user",
          text,
          at: Date.now(),
          viaVoice: options.viaVoice,
        },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: text,
            userId,
            sessionId: sessionIdRef.current,
            channel,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          (ChatResponse & { error?: string; detail?: string }) | null;

        if (!response.ok || !payload?.reply) {
          const message =
            payload?.error ??
            "FinBridge could not answer that. Please try again.";
          setError(
            payload?.detail ? `${message} (${payload.detail})` : message,
          );
          setMessages((current) => [
            ...current,
            {
              id: newId("a"),
              author: "agent",
              text: message,
              at: Date.now(),
              failed: true,
            },
          ]);
          return;
        }

        if (payload.sessionId) sessionIdRef.current = payload.sessionId;

        const agentMessage: TranscriptMessage = {
          id: newId("a"),
          author: "agent",
          text: payload.reply,
          at: Date.now(),
          sources: payload.supportSources,
          suggestedNextStep: payload.suggestedNextStep,
          editableDraft: payload.editableDraft,
        };
        setMessages((current) => [...current, agentMessage]);
        onAgentMessageRef.current?.(agentMessage, channel);
      } catch {
        const message =
          "Lost connection to FinBridge. Check your network and try again.";
        setError(message);
        setMessages((current) => [
          ...current,
          {
            id: newId("a"),
            author: "agent",
            text: message,
            at: Date.now(),
            failed: true,
          },
        ]);
      } finally {
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [userId],
  );

  return {
    messages,
    pending,
    error,
    send,
    reset,
    sessionId: sessionIdRef.current,
    clearError: useCallback(() => setError(null), []),
  };
}
