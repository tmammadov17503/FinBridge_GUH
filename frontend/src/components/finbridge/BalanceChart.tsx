import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatDay, formatMoney } from "@/lib/format";
import type { BalanceForecast } from "@/lib/finbridge/types";

interface Row {
  date: string;
  base: number;
  changed: number | undefined;
}

const BASE = {
  key: "base",
  label: "Current plan",
  color: "var(--chart-1)",
} as const;
// "changed" is the reduced-wages scenarioB sent by src/routes/api/chat.ts.
const CHANGED = {
  key: "changed",
  label: "If you lose shifts",
  color: "var(--chart-2)",
  dash: "6 4",
} as const;

type Series = { label: string; color: string; dash?: string | undefined };

function toRows(forecast: BalanceForecast): Row[] {
  // A workflow that predates dailySeries sends neither field, so there is nothing to plot.
  const base =
    forecast.scenarios?.base.dailySeries ?? forecast.dailySeries ?? [];
  const changed = new Map(
    forecast.scenarios?.changed.dailySeries.map((d) => [d.date, d.balance]),
  );
  return base.map((d) => ({
    date: d.date,
    base: d.balance,
    changed: changed.get(d.date),
  }));
}

/** Clean axis ticks that always include £0, so a shortfall reads as crossing the line. */
function niceTicks(values: number[]): number[] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  const step =
    steps.find((s) => (max - min) / s <= 5) ?? steps[steps.length - 1]!;
  const ticks: number[] = [];
  for (
    let t = Math.floor(min / step) * step;
    t <= Math.ceil(max / step) * step;
    t += step
  ) {
    ticks.push(t);
  }
  return ticks;
}

function LineKey({ color, dash }: Pick<Series, "color" | "dash">) {
  return (
    <svg width="20" height="2" aria-hidden className="shrink-0">
      <line
        x1="0"
        y1="1"
        x2="20"
        y2="1"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dash}
      />
    </svg>
  );
}

function ChartTooltip({
  active,
  payload,
  series,
}: TooltipProps<number, string> & { series: (Series & { key: keyof Row })[] }) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-sm text-popover-foreground">
      <p className="text-muted-foreground">{formatDay(row.date)}</p>
      {series.map((s) => (
        <p key={s.key} className="mt-0.5 flex items-center gap-2">
          <LineKey color={s.color} dash={s.dash} />
          <span className="font-medium">
            {formatMoney(row[s.key] as number)}
          </span>
          <span className="text-muted-foreground">{s.label}</span>
        </p>
      ))}
    </div>
  );
}

export function BalanceChart({ forecast }: { forecast: BalanceForecast }) {
  const rows = toRows(forecast);
  if (rows.length === 0) return null;

  const hasChanged = rows.some((r) => r.changed !== undefined);
  const series = hasChanged ? [BASE, CHANGED] : [BASE];
  const ticks = niceTicks(
    rows.flatMap((r) =>
      r.changed === undefined ? [r.base] : [r.base, r.changed],
    ),
  );

  // Label each line's final balance, unless the two would sit on top of each other.
  const last = rows[rows.length - 1]!;
  const tickRange = ticks[ticks.length - 1]! - ticks[0]!;
  const labelsClear =
    last.changed === undefined ||
    Math.abs(last.base - last.changed) / tickRange > 0.08;

  function endLabel(props: {
    x?: string | number;
    y?: string | number;
    index?: number;
    value?: string | number;
  }) {
    if (props.index !== rows.length - 1) return <g key={props.index} />;
    return (
      <text
        key={props.index}
        x={Number(props.x) + 8}
        y={Number(props.y) + 4}
        fill="var(--foreground)"
        fontSize={12}
      >
        {formatMoney(Number(props.value))}
      </text>
    );
  }

  return (
    <figure className="mt-5">
      <figcaption className="font-medium">
        Your balance until your next loan
        <span className="font-normal text-muted-foreground">
          {" "}
          · sample figures
        </span>
      </figcaption>
      {hasChanged && (
        <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {[BASE, CHANGED].map((s: Series) => (
            <li key={s.label} className="flex items-center gap-2">
              <LineKey color={s.color} dash={s.dash} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            accessibilityLayer
            margin={{ top: 8, right: 52, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              interval="preserveStartEnd"
              minTickGap={40}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              domain={[ticks[0]!, ticks[ticks.length - 1]!]}
              ticks={ticks}
              tickFormatter={formatMoney}
              width={48}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Tooltip
              cursor={{ stroke: "var(--input)" }}
              isAnimationActive={false}
              content={<ChartTooltip series={series} />}
            />
            {/* Drawn first so the current plan stays on top where the two lines match. */}
            {hasChanged && (
              <Line
                dataKey={CHANGED.key}
                name={CHANGED.label}
                type="stepAfter"
                stroke={CHANGED.color}
                strokeWidth={2}
                strokeDasharray={CHANGED.dash}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                label={labelsClear ? endLabel : false}
              />
            )}
            <Line
              dataKey={BASE.key}
              name={BASE.label}
              type="stepAfter"
              stroke={BASE.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={endLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-1 text-sm">
        <summary className="inline-block min-h-6 cursor-pointer text-muted-foreground hover:text-foreground">
          Show as a table
        </summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="py-1 text-left font-normal">
                Date
              </th>
              {series.map((s) => (
                <th
                  key={s.key}
                  scope="col"
                  className="py-1 text-right font-normal"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-b border-border">
                <th scope="row" className="py-1 text-left font-normal">
                  {formatDay(r.date)}
                </th>
                <td className="py-1 text-right">{formatMoney(r.base)}</td>
                {hasChanged && (
                  <td className="py-1 text-right">
                    {r.changed === undefined ? "–" : formatMoney(r.changed)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
