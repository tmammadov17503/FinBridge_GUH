import { z } from "zod";

import type { ChatResponse, SupportSource } from "./types";

/**
 * The chat contract: what we accept from the browser, and how we read whatever n8n sends
 * back. Kept apart from the route handler so both halves can be tested without a server.
 */

/**
 * User text is data, never instructions, and it is length-bounded before it goes anywhere —
 * the same rule the retrieval layer follows. We do not rewrite the message beyond trimming;
 * the agent prompt is responsible for treating it as a quoted question.
 */
export const MAX_MESSAGE_CHARS = 1_200;

export const ChatBody = z.object({
  message: z.string().trim().min(1, "Message is empty").max(MAX_MESSAGE_CHARS),
  userId: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "userId must be a plain slug"),
  sessionId: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  channel: z.enum(["web", "voice"]).optional(),
});

export type ChatBodyInput = z.infer<typeof ChatBody>;

/**
 * n8n webhook responses vary with how the "Respond to Webhook" node is configured: a bare
 * object, a single-element array, or `{ json: ... }` around either. Unwrap all three.
 */
export function unwrap(payload: unknown): Record<string, unknown> {
  let node = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(node)) {
      node = node[0];
      continue;
    }
    if (node && typeof node === "object" && "json" in node) {
      node = (node as { json: unknown }).json;
      continue;
    }
    break;
  }
  return node && typeof node === "object"
    ? (node as Record<string, unknown>)
    : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** The agent node's text lands under different keys depending on which node answers. */
export function pickReply(data: Record<string, unknown>): string | undefined {
  for (const key of [
    "reply",
    "output",
    "text",
    "explanation",
    "answer",
    "message",
  ]) {
    const value = data[key];
    const text = asString(value);
    if (text) return text;
  }
  return undefined;
}

/**
 * Keep only the catalogue fields the UI renders, and drop any entry without a real http(s)
 * URL. Source cards are built from this, never from model prose — so a link the model
 * invented in its answer text cannot become a card.
 */
export function pickSources(value: unknown): SupportSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources = value.flatMap((raw): SupportSource[] => {
    if (!raw || typeof raw !== "object") return [];
    const entry = raw as Record<string, unknown>;
    const url = asString(entry["url"]);
    const title = asString(entry["title"]);
    if (!url || !title) return [];
    if (!/^https?:\/\//i.test(url)) return [];
    return [
      {
        id: asString(entry["id"]) ?? url,
        title,
        provider: asString(entry["provider"]) ?? "Provider",
        url,
        summary: asString(entry["summary"]),
        actionLabel: asString(entry["actionLabel"]),
        caution: asString(entry["caution"]),
      },
    ];
  });
  return sources.length > 0 ? sources : undefined;
}

/**
 * Turn an n8n payload into the one shape the browser sees. Returns undefined when there is
 * no usable reply, which the route turns into an error rather than an empty bubble.
 */
export function toChatResponse(
  payload: unknown,
  fallback: { userId: string; sessionId?: string | undefined },
): ChatResponse | undefined {
  const data = unwrap(payload);
  const reply = pickReply(data);
  if (!reply) return undefined;

  return {
    reply,
    sessionId: asString(data["sessionId"]) ?? fallback.sessionId,
    userId: asString(data["userId"]) ?? fallback.userId,
    supportSources: pickSources(data["supportSources"] ?? data["sources"]),
    catalogueCheckedAt: asString(data["catalogueCheckedAt"]),
    suggestedNextStep: asString(data["suggestedNextStep"]),
    editableDraft: asString(data["editableDraft"] ?? data["draft"]),
  };
}
