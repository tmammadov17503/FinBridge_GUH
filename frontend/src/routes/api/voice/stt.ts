import { createFileRoute } from "@tanstack/react-router";

import {
  ConfigError,
  ELEVENLABS_API,
  elevenLabsKey,
  sttModelId,
} from "@/lib/finbridge/server-config";
import type { SttResponse } from "@/lib/finbridge/types";

/**
 * Speech -> text. The browser posts a recorded clip as multipart form data; we forward it to
 * ElevenLabs Scribe and return just the transcript.
 *
 * The transcript is then sent through the ordinary chat route, so a spoken question and a
 * typed one travel the same path and land in the same transcript.
 */

/** A spoken question is seconds long. Anything larger is a mistake or an abuse. */
const MAX_CLIP_BYTES = 10 * 1024 * 1024;

const ACCEPTED_AUDIO = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "video/webm", // Chrome labels MediaRecorder webm/opus this way.
  "video/mp4", // Safari does the same for mp4/aac.
];

function bad(status: number, error: string, detail?: string): Response {
  return Response.json({ error, detail }, { status });
}

export const Route = createFileRoute("/api/voice/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return bad(400, "Expected an audio upload.");
        }

        const clip = form.get("audio");
        if (!(clip instanceof File) || clip.size === 0) {
          return bad(
            400,
            "No audio was recorded. Try holding the mic a little longer.",
          );
        }
        if (clip.size > MAX_CLIP_BYTES) {
          return bad(
            413,
            "That recording is too long. Keep it under a minute.",
          );
        }

        // MediaRecorder reports e.g. "audio/webm;codecs=opus"; compare the type alone.
        const mime = (clip.type.split(";")[0] ?? "").trim().toLowerCase();
        if (mime && !ACCEPTED_AUDIO.includes(mime)) {
          return bad(415, "That audio format is not supported.", mime);
        }

        let key: string;
        try {
          key = elevenLabsKey();
        } catch (error) {
          if (error instanceof ConfigError) {
            console.error(`[finbridge] ${error.message}`);
            return bad(
              503,
              "Voice input is not set up.",
              `Missing ${error.missing}.`,
            );
          }
          throw error;
        }

        const upstreamForm = new FormData();
        upstreamForm.set("model_id", sttModelId());
        // UK English: pinning the language stops short clips being misdetected.
        upstreamForm.set("language_code", "eng");
        upstreamForm.set("file", clip, clip.name || "question.webm");

        let upstream: Response;
        try {
          upstream = await fetch(`${ELEVENLABS_API}/speech-to-text`, {
            method: "POST",
            headers: { "xi-api-key": key },
            body: upstreamForm,
            signal: AbortSignal.timeout(30_000),
          });
        } catch (error) {
          console.error("[finbridge] elevenlabs stt unreachable", error);
          return bad(
            504,
            "The transcription service did not respond. You can type instead.",
          );
        }

        if (!upstream.ok) {
          const detail = (await upstream.text().catch(() => "")).slice(0, 300);
          console.error(
            `[finbridge] elevenlabs stt ${upstream.status}: ${detail}`,
          );
          return bad(
            502,
            upstream.status === 401
              ? "The transcription service rejected our key."
              : "Could not understand that recording.",
            `Transcription service returned ${upstream.status}.`,
          );
        }

        const data = (await upstream.json().catch(() => null)) as {
          text?: unknown;
          language_code?: unknown;
        } | null;
        const text = typeof data?.text === "string" ? data.text.trim() : "";

        if (!text) {
          return bad(
            422,
            "That recording came back empty. Try again, a little closer to the mic.",
          );
        }

        const payload: SttResponse = {
          text,
          languageCode:
            typeof data?.language_code === "string"
              ? data.language_code
              : undefined,
        };

        return Response.json(payload, {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
