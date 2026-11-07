/**
 * Server-only configuration.
 *
 * IMPORTANT: nothing in this module may be imported from a component. It reads
 * `process.env`, which on the client is either undefined or — worse, under a bundler that
 * inlines it — a way to leak the ElevenLabs key into browser JavaScript. The API key is
 * read here and used only inside `src/routes/api/*`.
 */

function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class ConfigError extends Error {
  readonly missing: string;
  constructor(missing: string, hint: string) {
    super(`${missing} is not set. ${hint}`);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

/* ------------------------------------------------------------------- n8n */

/**
 * Base URL of the running n8n instance, with no trailing slash and no `/webhook` suffix —
 * e.g. `https://example.app.n8n.cloud`.
 */
export function n8nBaseUrl(): string {
  const base = env("N8N_BASE_URL");
  if (!base) {
    throw new ConfigError(
      "N8N_BASE_URL",
      "Set it to the base URL of the n8n instance running the FinBridge workflows, e.g. https://your-instance.app.n8n.cloud (no trailing slash, no /webhook).",
    );
  }
  return base.replace(/\/+$/, "");
}

/** Optional shared secret, sent as a header on every webhook call.
 * Supports FINBRIDGE_WEBHOOK_SECRET (sends as X-FinBridge-Key) or the split
 * N8N_WEBHOOK_AUTH_HEADER / N8N_WEBHOOK_AUTH_VALUE pair. */
export function n8nAuthHeaders(): Record<string, string> {
  const secret = env("FINBRIDGE_WEBHOOK_SECRET");
  if (secret) return { "X-FinBridge-Key": secret };
  const name = env("N8N_WEBHOOK_AUTH_HEADER");
  const value = env("N8N_WEBHOOK_AUTH_VALUE");
  if (!name || !value) return {};
  return { [name]: value };
}

/** `/webhook` in production; `/webhook-test` while a workflow is pinned open in the editor. */
export function n8nWebhookPath(): string {
  return env("N8N_WEBHOOK_PATH") ?? "/webhook";
}

export function n8nUrl(route: "finbridge/chat" | "finbridge/forecast"): string {
  // Allow overriding with the full URL directly (FINBRIDGE_WEBHOOK_URL covers the chat route).
  const full = env("FINBRIDGE_WEBHOOK_URL");
  if (full && route === "finbridge/chat") return full;
  return `${n8nBaseUrl()}${n8nWebhookPath()}/${route}`;
}

/* --------------------------------------------------------------- anthropic */

/** Direct Anthropic key — used to give natural, question-aware replies without going via n8n. */
export function anthropicKey(): string | undefined {
  return env("ANTHROPIC_API_KEY");
}

/* ------------------------------------------------------------ elevenlabs */

export const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

export function elevenLabsKey(): string {
  const key = env("ELEVENLABS_API_KEY");
  if (!key) {
    throw new ConfigError(
      "ELEVENLABS_API_KEY",
      "Create a key at https://elevenlabs.io/app/settings/api-keys and put it in new_frontend/.env.local. It must never be exposed to the browser.",
    );
  }
  return key;
}

/**
 * Default voice: "Lily", a warm British English voice, which suits a UK support tool.
 * Override per deployment with ELEVENLABS_VOICE_ID.
 */
export const DEFAULT_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";

/** Voices the client is allowed to ask for, so a crafted request cannot bill arbitrary ids. */
export const ALLOWED_VOICES: Record<string, string> = {
  lily: "pFZP5JQG7iQjIQuC4Bku",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  river: "SAz9YHcvj6GT2YYXdXww",
  will: "bIHbv24MWmeRgasZH58o",
};

export function resolveVoiceId(requested?: string | null): string {
  const fallback = env("ELEVENLABS_VOICE_ID") ?? DEFAULT_VOICE_ID;
  if (!requested) return fallback;
  return ALLOWED_VOICES[requested.toLowerCase()] ?? fallback;
}

/** Flash is the lowest-latency model, which matters most in a spoken turn. */
export function ttsModelId(): string {
  return env("ELEVENLABS_TTS_MODEL") ?? "eleven_flash_v2_5";
}

export function sttModelId(): string {
  return env("ELEVENLABS_STT_MODEL") ?? "scribe_v2";
}
