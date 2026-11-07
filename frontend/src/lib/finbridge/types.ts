/**
 * Shared shapes for the FinBridge agent layer.
 *
 * These mirror the contract documented in `n8n-agent-architecture.md`. Every field the
 * backend is not guaranteed to send is optional: the n8n workflow is still being built, so
 * the UI must degrade rather than crash when a key is missing.
 */

/** Demo personas the n8n `Load User Data` node knows about. */
export const DEMO_USERS = [
  {
    id: "demo-amira",
    name: "Amira",
    blurb: "Zero-hours retail, single parent",
    risk: "medium",
  },
  {
    id: "demo-josh",
    name: "Josh",
    blurb: "Student, termly loan",
    risk: "medium",
  },
  {
    id: "demo-priya",
    name: "Priya",
    blurb: "Salaried, building savings",
    risk: "low",
  },
] as const;

export type DemoUserId = (typeof DEMO_USERS)[number]["id"];

/** Which front door a message came through. Drives answer length in the n8n prompt. */
export type Channel = "web" | "voice";

/**
 * Voices the user may pick. These are keys, not ElevenLabs voice ids: the server maps them
 * through `ALLOWED_VOICES`, so the browser cannot ask for an arbitrary voice.
 */
export const VOICE_CHOICES = [
  { key: "lily", label: "Lily — British, warm" },
  { key: "matilda", label: "Matilda — British, measured" },
  { key: "will", label: "Will — British, relaxed" },
  { key: "sarah", label: "Sarah — reassuring" },
  { key: "river", label: "River — neutral" },
] as const;

export type VoiceKey = (typeof VOICE_CHOICES)[number]["key"];

/* ------------------------------------------------------------------ chat */

export interface ChatRequest {
  message: string;
  userId: string;
  sessionId?: string | undefined;
  channel?: Channel | undefined;
}

/**
 * A curated support provider from `knowledge/sources.json`.
 *
 * The UI renders these from the catalogue payload, never from model prose — that is the
 * "the LLM never picks a link" rule in the project README.
 */
export interface SupportSource {
  id: string;
  title: string;
  provider: string;
  url: string;
  summary?: string | undefined;
  actionLabel?: string | undefined;
  /** Every catalogue record carries one; the UI must show it beside the link. */
  caution?: string | undefined;
}

export interface ChatResponse {
  reply: string;
  sessionId?: string | undefined;
  userId?: string | undefined;
  /** Present once the retrieval node is wired in; absent responses render without cards. */
  supportSources?: SupportSource[] | undefined;
  /** ISO date the catalogue was last human-checked. */
  catalogueCheckedAt?: string | undefined;
  suggestedNextStep?: string | undefined;
  /** A message FinBridge drafted for the user to review and send themselves. */
  editableDraft?: string | undefined;
}

/* -------------------------------------------------------------- forecast */

export interface ForecastPoint {
  day: number;
  balance: number;
}

export interface ForecastScenario {
  weekly?: ForecastPoint[];
  firstOverdraftDay?: number | null;
  lowestBalance?: number;
}

export type ScenarioId =
  "base" | "income_dip" | "unexpected_cost" | "perfect_storm";

export interface ForecastSnapshot {
  monthlyIncome?: number;
  monthlyOutgoings?: number;
  monthlySurplus?: number;
  bufferDays?: number;
  safeToSpendPerDayUntilNextIncome?: number;
  spendByCategoryMonthly?: Record<string, number>;
}

export interface Forecast {
  riskLevel?: "low" | "medium" | "high" | string;
  currentBalance?: number;
  snapshot?: ForecastSnapshot;
  scenarios?: Partial<Record<ScenarioId, ForecastScenario>>;
  flags?: string[];
  nudges?: string[];
  /** The stated basis for every number above. Always surface these next to the figures. */
  assumptions?: string[];
}

/* ------------------------------------------------------------ transcript */

export type MessageAuthor = "user" | "agent";

export interface TranscriptMessage {
  id: string;
  author: MessageAuthor;
  text: string;
  at: number;
  /** Set when the text came from the microphone rather than the keyboard. */
  viaVoice?: boolean | undefined;
  /** Attached to agent turns only. */
  sources?: SupportSource[] | undefined;
  suggestedNextStep?: string | undefined;
  editableDraft?: string | undefined;
  /** Marks a locally generated failure notice so it can be styled as an error. */
  failed?: boolean | undefined;
}

/* ----------------------------------------------------------------- voice */

export interface SttResponse {
  text: string;
  languageCode?: string | undefined;
}

/** Thrown shape for both proxy routes, so the client can show something useful. */
export interface ApiError {
  error: string;
  detail?: string | undefined;
}
