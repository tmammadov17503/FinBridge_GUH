import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks agent replies through the `/api/voice/tts` proxy.
 *
 * One utterance at a time: asking for a new one cancels whatever is playing, which is what
 * you want when the user fires off another question mid-sentence.
 */

interface Options {
  /** Runs after an utterance finishes on its own — not after `stop()`. Used for hands-free. */
  onFinished?: () => void;
}

export interface SpeakRequest {
  text: string;
  /** Identifies which message is speaking, so the UI can mark that bubble. */
  messageId: string;
  voice?: string;
}

export function useSpeech({ onFinished }: Options = {}) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Bumped on every stop/speak so a slow in-flight fetch cannot start playing late. */
  const turnRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
    }
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    turnRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    releaseAudio();
    setSpeakingId(null);
    setPreparingId(null);
  }, [releaseAudio]);

  const speak = useCallback(
    async ({ text, messageId, voice }: SpeakRequest) => {
      // Strip markdown so ElevenLabs doesn't speak "asterisk asterisk bold asterisk asterisk".
      // Also keep it under the 1500-char TTS cap by truncating at a sentence boundary.
      const stripped = text
        .trim()
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/^[•\-\*]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .trim();
      const trimmed =
        stripped.length <= 1400
          ? stripped
          : (stripped.slice(0, 1400).match(/^.*[.!?]/s)?.[0] ??
            stripped.slice(0, 1400));
      if (!trimmed) return;

      stop();
      const turn = (turnRef.current += 1);
      const controller = new AbortController();
      abortRef.current = controller;
      setPreparingId(messageId);
      setError(null);

      try {
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: trimmed, voice }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(detail?.error ?? "Could not play the spoken reply.");
        }

        const blob = await response.blob();
        // A newer turn started while we were fetching: drop this audio on the floor.
        if (turn !== turnRef.current) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          if (turn !== turnRef.current) return;
          releaseAudio();
          setSpeakingId(null);
          onFinishedRef.current?.();
        };
        audio.onerror = () => {
          if (turn !== turnRef.current) return;
          releaseAudio();
          setSpeakingId(null);
          setError(
            "The spoken reply could not be played. It is still on screen.",
          );
        };

        setPreparingId(null);
        setSpeakingId(messageId);
        await audio.play();
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        if (turn !== turnRef.current) return;
        releaseAudio();
        setPreparingId(null);
        setSpeakingId(null);
        // Autoplay blocking is the common case here and is not worth alarming language.
        const message =
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "Your browser blocked audio. Press the speaker on a reply to hear it."
            : cause instanceof Error
              ? cause.message
              : "Could not play the spoken reply.";
        setError(message);
      }
    },
    [releaseAudio, stop],
  );

  useEffect(() => {
    return () => {
      turnRef.current += 1;
      abortRef.current?.abort();
      releaseAudio();
    };
  }, [releaseAudio]);

  return {
    speak,
    stop,
    speakingId,
    preparingId,
    isSpeaking: speakingId !== null,
    isPreparing: preparingId !== null,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
