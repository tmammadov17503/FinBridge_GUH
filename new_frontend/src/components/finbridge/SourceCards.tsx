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
    <div className="mt-5">
      <p className="mb-2 font-medium">Support to look at</p>
      <ul className="border-b border-border">
        {sources.map((source) => (
          <li key={source.id} className="border-t border-border py-3">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-2 hover:no-underline"
            >
              {source.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="text-sm text-muted-foreground">{source.provider}</p>
            {source.summary ? (
              <p className="mt-1.5 text-sm">{source.summary}</p>
            ) : null}
            {source.caution ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {source.caution}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {checkedAt ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Catalogue last checked {checkedAt}. Eligibility is decided by each
          provider.
        </p>
      ) : null}
    </div>
  );
}
