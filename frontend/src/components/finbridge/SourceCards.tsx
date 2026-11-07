import { ExternalLink, Info } from "lucide-react";

import type { SupportSource } from "@/lib/finbridge/types";

/**
 * Support provider cards.
 *
 * These are built from the curated catalogue payload, never parsed out of the model's prose —
 * that is the project's "the LLM never picks a link" rule. Each card shows the provider's own
 * caution, because eligibility is decided by the provider and not by FinBridge.
 */
export function SourceCards({
  sources,
  checkedAt,
}: {
  sources: SupportSource[];
  checkedAt?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Support to look at
      </p>
      <ul className="flex flex-col gap-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className="rounded-xl border border-border bg-background p-3"
          >
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
            >
              <span>{source.title}</span>
              <ExternalLink
                className="mt-1 h-3.5 w-3.5 shrink-0 opacity-70"
                aria-hidden
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="text-xs text-muted-foreground">{source.provider}</p>
            {source.summary ? (
              <p className="mt-1.5 text-sm text-foreground/90">
                {source.summary}
              </p>
            ) : null}
            {source.caution ? (
              <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{source.caution}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {checkedAt ? (
        <p className="text-xs text-muted-foreground">
          Catalogue last checked {checkedAt}. Eligibility is decided by each
          provider.
        </p>
      ) : null}
    </div>
  );
}
