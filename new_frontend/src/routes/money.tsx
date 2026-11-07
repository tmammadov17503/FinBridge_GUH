import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Search,
  X,
  ExternalLink,
  ChevronRight,
  Banknote,
  Zap,
  Baby,
  Heart,
  Home,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBar } from "@/components/NavBar";
import moneyRaw from "@/data/lifeline/find_money.json";

export const Route = createFileRoute("/money")({
  head: () => ({ meta: [{ title: "Money Where It Is — FinBridge" }] }),
  component: MoneyPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupportOption {
  support_id: string;
  name: string;
  description: string;
  support_category: string;
  who_can_apply: string;
  eligibility_criteria: string[];
  geographic_availability: string;
  application_method: string;
  availability_status: string;
  source_name: string;
  source_url: string;
  last_verified: string;
  additional_notes: string | null;
  income_threshold: string | null;
  savings_threshold: string | null;
  support_value: string | null;
  application_url: string | null;
  documents_required: string[];
  deadline: string | null;
}

const options: SupportOption[] = (moneyRaw as { support_options: SupportOption[] }).support_options;

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; Icon: typeof Banknote; color: string }[] = [
  { key: "Low household income",         label: "Low income",    Icon: Banknote,     color: "text-green-700  bg-green-50  dark:text-green-300  dark:bg-green-900/20" },
  { key: "Benefit entitlement",          label: "Benefits",      Icon: Calculator,   color: "text-blue-600   bg-blue-50   dark:text-blue-300   dark:bg-blue-900/20" },
  { key: "Energy and utility costs",     label: "Energy",        Icon: Zap,          color: "text-amber-700  bg-amber-50  dark:text-amber-300  dark:bg-amber-900/20" },
  { key: "Children and education",       label: "Children",      Icon: Baby,         color: "text-pink-700   bg-pink-50   dark:text-pink-300   dark:bg-pink-900/20" },
  { key: "Disability and health-related costs", label: "Disability", Icon: Heart,    color: "text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20" },
  { key: "Council Tax",                  label: "Council Tax",   Icon: Home,         color: "text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20" },
  { key: "Financial hardship",           label: "Hardship",      Icon: AlertCircle,  color: "text-lifeline   bg-lifeline/10" },
];

function categoryConfig(cat: string) {
  return CATEGORIES.find((c) => c.key === cat) ?? { key: cat, label: cat, Icon: Banknote, color: "text-muted-foreground bg-muted" };
}

// ── Support Card ──────────────────────────────────────────────────────────────

function SupportCard({
  option,
  onDetail,
}: {
  option: SupportOption;
  onDetail: (o: SupportOption) => void;
}) {
  const cfg = categoryConfig(option.support_category);
  return (
    <article className="fb-card p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cfg.color)}>
            <cfg.Icon className="h-3 w-3" aria-hidden />
            {cfg.label}
          </span>
          {option.availability_status === "Currently available" && (
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
              Available
            </span>
          )}
        </div>
        <h3 className=" text-sm">{option.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{option.description}</p>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p><span className="font-medium text-foreground">Where:</span> {option.geographic_availability}</p>
        {option.support_value && (
          <p><span className="font-medium text-foreground">Value:</span> {option.support_value}</p>
        )}
        {option.savings_threshold && (
          <p><span className="font-medium text-foreground">Savings limit:</span> {option.savings_threshold}</p>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onDetail(option)}
          className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          Details <ChevronRight className="h-3 w-3" />
        </button>
        {option.application_url && (
          <a
            href={option.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-90 transition-[filter]"
          >
            Apply <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

// ── Detail Drawer / Panel ─────────────────────────────────────────────────────

function SchemeDetail({
  option,
  onClose,
}: {
  option: SupportOption;
  onClose: () => void;
}) {
  const cfg = categoryConfig(option.support_category);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative w-full max-w-lg fb-dialog p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 hover:bg-accent"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cfg.color)}>
            <cfg.Icon className="h-3 w-3" aria-hidden />
            {cfg.label}
          </span>
          {option.availability_status === "Currently available" && (
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
              Currently available
            </span>
          )}
        </div>

        <h2 className="text-lg mb-1">{option.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">{option.description}</p>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className=" mb-1">Who can apply</h3>
            <p className="text-muted-foreground">{option.who_can_apply}</p>
          </div>

          {option.eligibility_criteria.length > 0 && (
            <div>
              <h3 className=" mb-1">Eligibility criteria</h3>
              <ul className="space-y-1">
                {option.eligibility_criteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-muted-foreground text-xs">
                    <span className="shrink-0 text-link mt-0.5">▸</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h3 className=" mb-1">Where</h3>
              <p className="text-xs text-muted-foreground">{option.geographic_availability}</p>
            </div>
            {option.support_value && (
              <div>
                <h3 className=" mb-1">Potential value</h3>
                <p className="text-xs text-muted-foreground">{option.support_value}</p>
              </div>
            )}
            {option.income_threshold && (
              <div>
                <h3 className=" mb-1">Income limit</h3>
                <p className="text-xs text-muted-foreground">{option.income_threshold}</p>
              </div>
            )}
            {option.savings_threshold && (
              <div>
                <h3 className=" mb-1">Savings limit</h3>
                <p className="text-xs text-muted-foreground">{option.savings_threshold}</p>
              </div>
            )}
            {option.deadline && (
              <div>
                <h3 className=" mb-1">Deadline</h3>
                <p className="text-xs text-muted-foreground">{option.deadline}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className=" mb-1">How to apply</h3>
            <p className="text-xs text-muted-foreground">{option.application_method}</p>
          </div>

          {option.documents_required.length > 0 && (
            <div>
              <h3 className=" mb-1">Documents you may need</h3>
              <div className="flex flex-wrap gap-1">
                {option.documents_required.map((d, i) => (
                  <span key={i} className="rounded border border-border bg-background px-2 py-0.5 text-xs">{d}</span>
                ))}
              </div>
            </div>
          )}

          {option.additional_notes && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">{option.additional_notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Source: {option.source_name} · Verified {option.last_verified}
            </span>
            {option.source_url && (
              <a href={option.source_url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-link hover:underline underline-offset-2">
                Source ↗
              </a>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Eligibility is decided by the scheme provider, not FinBridge. These details are drawn from public sources and may change. Always check directly with the provider before applying.
            </p>
          </div>
        </div>

        {option.application_url && (
          <a
            href={option.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-90 transition-[filter]"
          >
            Go to application <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function MoneyPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportOption | null>(null);

  const filtered = useMemo(() => {
    let result = options;
    if (activeCategory) result = result.filter((o) => o.support_category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.support_category.toLowerCase().includes(q) ||
          o.eligibility_criteria.some((c) => c.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [query, activeCategory]);

  // Categories that have actual records
  const activeCats = CATEGORIES.filter((c) => options.some((o) => o.support_category === c.key));

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <div className="">
        <div className="mx-auto max-w-[1000px] px-5 md:px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-lifeline mb-2">Money Where It Is</p>
          <h1 className="text-3xl text-heading mb-3">
            There may be more support available than you think.
          </h1>
          <p className="text-muted-foreground mb-6 max-w-xl">
            Discover benefits, grants, discounts and other assistance you may be eligible for but haven't found yet.
            {options.length} schemes checked on {moneyRaw.last_updated}.
          </p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden />
            <input
              type="search"
              placeholder="Describe what you need help with…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Search for financial support"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-5 md:px-8 py-6 space-y-6">
        {/* Category grid */}
        <div>
          <h2 className="text-sm mb-3 text-muted-foreground uppercase tracking-wide">Browse by category</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {activeCats.map((cat) => {
              const count = options.filter((o) => o.support_category === cat.key).length;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(isActive ? null : cat.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-3 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <cat.Icon className="h-5 w-5" aria-hidden />
                  <span>{cat.label}</span>
                  <span className={cn("text-[10px]", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm">
              {filtered.length} scheme{filtered.length !== 1 ? "s" : ""} found
              {activeCategory && ` in ${categoryConfig(activeCategory).label}`}
            </h2>
            {(activeCategory || query) && (
              <button
                type="button"
                onClick={() => { setActiveCategory(null); setQuery(""); }}
                className="text-xs text-link hover:underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="fb-card p-10 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-semibold">No schemes matched your search</p>
              <p className="text-sm text-muted-foreground mt-1">Try different words or browse by category.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((option) => (
                <SupportCard key={option.support_id} option={option} onDetail={setDetail} />
              ))}
            </div>
          )}
        </div>

        {/* Worth checking section */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-5">
          <h2 className=" mb-1">Worth checking</h2>
          <p className="text-xs text-muted-foreground mb-3">
            These schemes are often missed. We show them because they're broadly applicable and regularly go unclaimed — not because we know you qualify.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.filter((o) => ["UC", "BEN-CALC", "WFC", "COUNCIL-TAX-REDUCTION"].includes(o.support_id)).map((o) => (
              <button
                key={o.support_id}
                type="button"
                onClick={() => setDetail(o)}
                className="text-left rounded-md border border-border bg-background px-4 py-3 hover:bg-accent transition-colors"
              >
                <p className="text-sm font-semibold">{o.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{o.description}</p>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Eligibility is decided by each scheme's provider. FinBridge does not check eligibility and cannot guarantee you will receive support. Information verified against provider sources on {moneyRaw.last_updated}.
        </p>
      </div>

      {detail && <SchemeDetail option={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
