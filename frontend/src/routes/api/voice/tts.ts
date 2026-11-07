import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  ConfigError,
  ELEVENLABS_API,
  elevenLabsKey,
  resolveVoiceId,
  ttsModelId,
} from "@/lib/finbridge/server-config";

/**
 * Text -> speech, proxied through our server so the ElevenLabs key never reaches the browser.
 *
 * The upstream audio stream is piped straight through rather than buffered, so playback can
 * start before the whole clip has been generated.
 */

/** A spoken reply is 2-4 sentences by design; this cap stops a runaway billing request. */
const MAX_TTS_CHARS = 1_500;

const TtsBody = z.object({
  text: z.string().trim().min(1).max(MAX_TTS_CHARS),
  /** A key from ALLOWED_VOICES, not a raw ElevenLabs voice id. */
  voice: z.string().trim().max(32).optional(),
});

function bad(status: number, error: string, detail?: string): Response {
  return Response.json({ error, detail }, { status });
}

export const Route = createFileRoute("/api/voice/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return bad(400, "Expected a JSON body.");
        }

        const parsed = TtsBody.safeParse(raw);
        if (!parsed.success) {
          return bad(
            400,
            "Nothing to read aloud.",
            parsed.error.issues[0]?.message,
          );
        }

        let key: string;
        try {
          key = elevenLabsKey();
        } catch (error) {
          if (error instanceof ConfigError) {
            console.error(`[finbridge] ${error.message}`);
            return bad(
              503,
              "Voice replies are not set up.",
              `Missing ${error.missing}.`,
            );
          }
          throw error;
        }

        const voiceId = resolveVoiceId(parsed.data.voice);
        const url = `${ELEVENLABS_API}/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

        let upstream: Response;
        try {
          upstream = await fetch(url, {
            method: "POST",
            headers: { "xi-api-key": key, "content-type": "application/json" },
            body: JSON.stringify({
              text: parsed.data.text,
              model_id: ttsModelId(),
              // Steady and clear: this voice reads money guidance, not a performance.
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 1.0,
              },
              apply_text_normalization: "auto",
            }),
            signal: AbortSignal.timeout(30_000),
          });
        } catch (error) {
          console.error("[finbridge] elevenlabs tts unreachable", error);
          return bad(
            504,
            "The voice service did not respond. The reply is still on screen.",
          );
        }

        if (!upstream.ok || !upstream.body) {
          const detail = (await upstream.text().catch(() => "")).slice(0, 300);
          console.error(
            `[finbridge] elevenlabs tts ${upstream.status}: ${detail}`,
          );
          return bad(
            502,
            upstream.status === 401
              ? "The voice service rejected our key."
              : "Could not generate the spoken reply.",
            `Voice service returned ${upstream.status}.`,
          );
        }

        // Stream through untouched. Never compress here: hosting compresses at the edge and a
        // double-encoded body plays as noise.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
