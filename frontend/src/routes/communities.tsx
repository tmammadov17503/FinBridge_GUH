import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { X, TrendingUp, TrendingDown, Minus, ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBar } from "@/components/NavBar";
import commRaw from "@/data/lifeline/communities.json";

export const Route = createFileRoute("/communities")({
  head: () => ({ meta: [{ title: "LIFELINE Communities — FinBridge" }] }),
  component: CommunitiesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Geography {
  country: string | null;
  region: string | null;
  local_authority: string | null;
  area_name: string;
  geography_code: string | null;
  geography_level: string;
}

interface Indicator {
  indicator_id: string;
  indicator_name: string;
  description: string;
  pressure_category: string;
  geography: Geography;
  value: number;
  unit: string;
  denominator: string | null;
  observation_period: string;
  publication_date: string;
  comparison_period: string | null;
  previous_value: number | null;
  trend: string | null;
  data_type: string;
  population_affected: string;
  methodology: string | null;
  limitations: string[];
  source_name: string;
  source_url: string;
}

const indicators: Indicator[] = (commRaw as { indicators: Indicator[] }).indicators;

// ── Pressure categories config ────────────────────────────────────────────────

const PRESSURE_CATS: { key: string; label: string; color: string }[] = [
  { key: "housing_and_rental_pressure",        label: "Housing & rent",   color: "#7c3aed" },
  { key: "energy_and_heating_costs",           label: "Energy & heating", color: "#d97706" },
  { key: "employment_and_income_instability",  label: "Employment",       color: "#0891b2" },
  { key: "childcare_and_family_costs",         label: "Childcare",        color: "#db2777" },
  { key: "local_financial_hardship",           label: "Hardship",         color: "#dc2626" },
];

function catConfig(key: string) {
  return PRESSURE_CATS.find((c) => c.key === key) ?? { key, label: key, color: "#6b7280" };
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return null;
  const lower = trend.toLowerCase();
  const increasing = lower.includes("increas") || lower.includes("rising") || lower.includes("higher");
  const decreasing = lower.includes("decreas") || lower.includes("falling") || lower.includes("lower");
  if (increasing) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
      <TrendingUp className="h-3 w-3" />
      {trend}
    </span>
  );
  if (decreasing) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
      <TrendingDown className="h-3 w-3" />
      {trend}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      {trend}
    </span>
  );
}

// ── Indicator Card ─────────────────────────────────────────────────────────────

function IndicatorCard({ indicator, onDetail }: { indicator: Indicator; onDetail: (i: Indicator) => void }) {
  const cfg = catConfig(indicator.pressure_category);
  const hasChange = indicator.previous_value !== null && indicator.value !== null;
  const pctChange = hasChange
    ? ((indicator.value - indicator.previous_value!) / Math.abs(indicator.previous_value!) * 100).toFixed(1)
    : null;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: cfg.color + "20", color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {indicator.geography.area_name}
          </span>
        </div>
        <h3 className="text-sm font-semibold">{indicator.indicator_name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{indicator.description}</p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {indicator.unit.includes("GBP") ? "£" : ""}{indicator.value.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">{indicator.unit.replace("GBP per month", "/mo").replace("GBP", "").trim()}</span>
          </p>
          {pctChange && (
            <p className={cn("text-xs font-medium", Number(pctChange) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
              {Number(pctChange) > 0 ? "▲" : "▼"} {Math.abs(Number(pctChange))}% vs {indicator.comparison_period}
            </p>
          )}
        </div>
        <TrendBadge trend={indicator.trend} />
      </div>

      <div className="text-xs text-muted-foreground">
        <p>{indicator.observation_period}</p>
        <p>{indicator.data_type}</p>
      </div>

      <button
        type="button"
        onClick={() => onDetail(indicator)}
        className="mt-auto text-left text-xs font-medium text-primary hover:underline underline-offset-2"
      >
        View indicator detail →
      </button>
    </article>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function IndicatorDetail({ indicator, onClose }: { indicator: Indicator; onClose: () => void }) {
  const cfg = catConfig(indicator.pressure_category);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-3"
          style={{ background: cfg.color + "20", color: cfg.color }}>
          {cfg.label}
        </span>
        <h2 className="text-lg font-bold mb-1">{indicator.indicator_name}</h2>
        <p className="text-sm text-muted-foreground mb-4">{indicator.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <h3 className="font-semibold text-xs text-muted-foreground uppercase mb-1">Value</h3>
            <p className="text-xl font-bold">{indicator.unit.includes("GBP") ? "£" : ""}{indicator.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{indicator.unit}</span></p>
            {indicator.previous_value !== null && <p className="text-xs text-muted-foreground">Previously: {indicator.unit.includes("GBP") ? "£" : ""}{indicator.previous_value.toLocaleString()}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-xs text-muted-foreground uppercase mb-1">Geography</h3>
            <p className="font-medium">{indicator.geography.area_name}</p>
            <p className="text-xs text-muted-foreground">{indicator.geography.geography_level}</p>
            {indicator.geography.geography_code && <p className="text-xs text-muted-foreground font-mono">{indicator.geography.geography_code}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-xs text-muted-foreground uppercase mb-1">Period</h3>
            <p className="text-xs">{indicator.observation_period}</p>
            {indicator.comparison_period && <p className="text-xs text-muted-foreground">Compared to: {indicator.comparison_period}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-xs text-muted-foreground uppercase mb-1">Published</h3>
            <p className="text-xs">{indicator.publication_date}</p>
            <p className="text-xs text-muted-foreground">{indicator.data_type}</p>
          </div>
        </div>

        {indicator.trend && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Trend</h3>
            <TrendBadge trend={indicator.trend} />
          </div>
        )}

        {indicator.population_affected && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Population affected</h3>
            <p className="text-xs text-muted-foreground">{indicator.population_affected}</p>
          </div>
        )}

        {indicator.denominator && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Denominator</h3>
            <p className="text-xs text-muted-foreground">{indicator.denominator}</p>
          </div>
        )}

        {indicator.methodology && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Methodology</h3>
            <p className="text-xs text-muted-foreground">{indicator.methodology}</p>
          </div>
        )}

        {indicator.limitations.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10 p-3 mb-4">
            <h3 className="font-semibold text-xs text-amber-800 dark:text-amber-300 mb-1">Limitations</h3>
            <ul className="space-y-1">
              {indicator.limitations.map((l, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-400">— {l}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Source: {indicator.source_name}</span>
          <a href={indicator.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2">
            Source <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function IndicatorsChart({ data }: { data: Indicator[] }) {
  // Build chart data: indicators with numeric values, normalised for comparison
  const chartData = data.map((ind) => ({
    name: ind.geography.area_name.length > 15
      ? ind.geography.area_name.slice(0, 13) + "…"
      : ind.geography.area_name,
    value: ind.value,
    unit: ind.unit,
    category: ind.pressure_category,
    full: ind.indicator_name,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-4">Indicator values by area</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value: number, _name: unknown, props: { payload?: { full?: string; unit?: string } }) => [
              `${value.toLocaleString()} ${props.payload?.unit ?? ""}`,
              props.payload?.full ?? "",
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={catConfig(entry.category).color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2">
        Values shown are from different indicator types and periods — only compare indicators of the same type and unit directly.
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function CommunitiesPage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeGeo, setActiveGeo] = useState<string | null>(null);
  const [detail, setDetail] = useState<Indicator | null>(null);

  const availableCats = useMemo(() => [...new Set(indicators.map((i) => i.pressure_category))], []);
  const geoLevels     = useMemo(() => [...new Set(indicators.map((i) => i.geography.geography_level))], []);

  const filtered = useMemo(() => {
    let r = indicators;
    if (activeCat)  r = r.filter((i) => i.pressure_category === activeCat);
    if (activeGeo)  r = r.filter((i) => i.geography.geography_level === activeGeo);
    return r;
  }, [activeCat, activeGeo]);

  // Headline stats: pick national-level ones for the overview
  const national = indicators.filter((i) => i.geography.geography_level === "national" || i.geography.geography_level === "country");

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="h-1 bg-primary" />

      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-lifeline mb-2">LIFELINE Communities</p>
          <h1 className="font-serif text-3xl font-bold text-heading mb-3">
            Where financial pressure is emerging across communities
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Aggregate, official-source data on housing, energy, employment and hardship pressures across the UK. This is not a league table — it shows where conditions are changing and why that matters.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-5 py-6 space-y-6">
        {/* Headline indicators */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Headline indicators</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {national.map((ind) => {
              const cfg = catConfig(ind.pressure_category);
              return (
                <div key={ind.indicator_id} className="rounded-2xl border border-border bg-card p-4">
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                  <p className="text-xl font-bold mt-1 tabular-nums">
                    {ind.unit.includes("GBP") ? "£" : ""}{ind.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">{ind.indicator_name}</p>
                  {ind.trend && <p className="text-xs text-muted-foreground mt-1 italic">{ind.trend}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <IndicatorsChart data={filtered} />

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Pressure category</p>
            <div className="flex flex-wrap gap-1">
              <button type="button"
                onClick={() => setActiveCat(null)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeCat === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}>
                All
              </button>
              {availableCats.map((cat) => {
                const cfg = catConfig(cat);
                return (
                  <button key={cat} type="button"
                    onClick={() => setActiveCat(cat === activeCat ? null : cat)}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activeCat === cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Geography level</p>
            <div className="flex flex-wrap gap-1">
              <button type="button"
                onClick={() => setActiveGeo(null)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeGeo === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}>
                All
              </button>
              {geoLevels.map((level) => (
                <button key={level} type="button"
                  onClick={() => setActiveGeo(level === activeGeo ? null : level)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize",
                    activeGeo === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}>
                  {level.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Indicator cards grid */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">{filtered.length} indicator{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="font-semibold">No indicators match the selected filters</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((ind) => (
                <IndicatorCard key={ind.indicator_id} indicator={ind} onDetail={setDetail} />
              ))}
            </div>
          )}
        </div>

        {/* Emerging pressures */}
        <div className="rounded-2xl border border-lifeline/30 bg-lifeline/5 p-5">
          <h2 className="font-semibold mb-1">Where pressures are emerging</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Patterns observed directly from the data. These are interpretations, not causal claims.
          </p>
          <div className="space-y-2">
            {indicators
              .filter((i) => i.trend?.toLowerCase().includes("increas") || i.trend?.toLowerCase().includes("rising"))
              .map((ind) => {
                const cfg = catConfig(ind.pressure_category);
                return (
                  <div key={ind.indicator_id} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <TrendingUp className="h-4 w-4 shrink-0 text-lifeline mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">{ind.indicator_name} ({ind.geography.area_name})</p>
                      <p className="text-xs text-muted-foreground">{ind.trend}</p>
                      <p className="text-xs" style={{ color: cfg.color }}>{cfg.label} · {ind.observation_period}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          All indicators use aggregate community-level data from official sources. No individual-level data is used or inferred. Data definitions, methodology and limitations are shown in each indicator detail view. Source: {commRaw.last_updated}.
        </p>
      </div>

      {detail && <IndicatorDetail indicator={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
