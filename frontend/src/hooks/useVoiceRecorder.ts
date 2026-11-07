import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Push-to-talk microphone capture.
 *
 * Click to start, click to stop — or stop talking and it ends the turn itself, which is what
 * makes the voice path feel like a conversation rather than a form. The hook owns the
 * MediaRecorder, the analyser used for the level meter, and the teardown of both.
 */

export type RecorderState = "idle" | "requesting" | "recording" | "stopping";

interface Options {
  /** Called with the finished clip. Not called if the clip is too short to be speech. */
  onClip: (clip: Blob) => void;
  /** Silence this long after speech has been detected ends the turn. */
  silenceMs?: number;
  /** Hard stop, so a stuck recorder cannot run forever. */
  maxMs?: number;
}

/** RMS below this counts as silence. Set by ear against a normal laptop mic. */
const SILENCE_RMS = 0.015;
/** Ignore clips shorter than this: they are almost always a mis-click. */
const MIN_CLIP_MS = 350;

/** Browsers disagree on container; take the first the engine admits to supporting. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useVoiceRecorder({
  onClip,
  silenceMs = 1_600,
  maxMs = 30_000,
}: Options) {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const quietSinceRef = useRef<number | null>(null);
  /** Latest callbacks, so the animation loop never closes over a stale `stop`. */
  const onClipRef = useRef(onClip);
  onClipRef.current = onClip;

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  /** Release the mic, the analyser and the animation frame. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setState("stopping");
    // `onstop` does the rest: it fires after the final dataavailable chunk.
    recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError(
        "This browser cannot record audio. You can type your question instead.",
      );
      return;
    }
    if (recorderRef.current) return;

    setError(null);
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : "";
      setState("idle");
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked. Allow it in your browser, or type instead."
          : name === "NotFoundError"
            ? "No microphone was found. You can type your question instead."
            : "Could not start recording. You can type your question instead.",
      );
      return;
    }

    streamRef.current = stream;

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      teardown();
      setState("idle");
      setError(
        "This browser cannot record in a supported format. Please type instead.",
      );
      return;
    }
    recorderRef.current = recorder;

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const duration = Date.now() - startedAtRef.current;
      const type = recorder.mimeType || mimeType || "audio/webm";
      teardown();
      setState("idle");
      setElapsedMs(0);
      if (duration < MIN_CLIP_MS || chunks.length === 0) return;
      onClipRef.current(new Blob(chunks, { type }));
    };
    recorder.onerror = () => {
      teardown();
      setState("idle");
      setError(
        "Recording stopped unexpectedly. You can type your question instead.",
      );
    };

    // Level meter + silence detection.
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        ctx.createMediaStreamSource(stream).connect(analyser);

        const samples = new Float32Array(analyser.fftSize);
        const tick = () => {
          rafRef.current = requestAnimationFrame(tick);
          analyser.getFloatTimeDomainData(samples);
          let sumSquares = 0;
          for (const sample of samples) sumSquares += sample * sample;
          const rms = Math.sqrt(sumSquares / samples.length);
          // Scale to roughly 0..1 for the meter without clipping quiet speech to nothing.
          setLevel(Math.min(1, rms * 12));

          const now = Date.now();
          setElapsedMs(now - startedAtRef.current);

          if (now - startedAtRef.current > maxMs) {
            stop();
            return;
          }
          if (rms > SILENCE_RMS) {
            heardSpeechRef.current = true;
            quietSinceRef.current = null;
          } else if (heardSpeechRef.current) {
            quietSinceRef.current ??= now;
            if (now - quietSinceRef.current > silenceMs) stop();
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch {
      // No analyser is survivable: recording still works, the meter just sits flat and the
      // user ends the turn by clicking stop.
    }

    heardSpeechRef.current = false;
    quietSinceRef.current = null;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    recorder.start(250);
    setState("recording");
  }, [maxMs, silenceMs, stop, supported, teardown]);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  }, [start, state, stop]);

  /** Never leave the mic light on because a component unmounted mid-turn. */
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      teardown();
    };
  }, [teardown]);

  return {
    state,
    level,
    elapsedMs,
    error,
    supported,
    isRecording: state === "recording",
    isBusy: state === "requesting" || state === "stopping",
    start,
    stop,
    toggle,
    clearError: useCallback(() => setError(null), []),
  };
}
