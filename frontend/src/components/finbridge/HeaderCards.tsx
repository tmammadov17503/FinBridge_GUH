import { headerCards } from "@/data/topics";
import { formatDay, formatMoney } from "@/lib/format";
import type { BalanceForecast } from "@/lib/finbridge/types";

/** The forecast's headline for the "Coming up" card, if it has one to show. */
function shortfallSummary(forecast: BalanceForecast | null): string | null {
  if (!forecast) return null;
  if (forecast.hasShortfall === false) {
    return "No shortfall before your next loan (sample figures).";
  }
  // A workflow that predates firstShortfallAmount leaves it out.
  if (forecast.firstShortfallAmount == null || !forecast.firstShortfallDate) {
    return null;
  }
  const depth = formatMoney(Math.abs(forecast.firstShortfallAmount));
  return `${depth} short on ${formatDay(forecast.firstShortfallDate)} (sample figures).`;
}

export function HeaderCards({
  forecast = null,
}: {
  forecast?: BalanceForecast | null;
}) {
  const summary = shortfallSummary(forecast);

  return (
    <section
      aria-label="Your summary"
      className="grid grid-cols-1 gap-6 border-b border-border pb-6 sm:grid-cols-3"
    >
      {headerCards.map((card) => {
        const live = card.title === "Coming up" ? summary : null;
        return (
          <div key={card.title}>
            <h2 className="font-sans text-sm font-semibold">{card.title}</h2>
            <p
              className={
                live
                  ? "mt-1 text-sm font-medium text-foreground"
                  : "mt-1 text-sm text-muted-foreground"
              }
            >
              {live ?? card.body}
            </p>
          </div>
        );
      })}
    </section>
  );
}
