import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBar } from "@/components/NavBar";
import intelligenceRaw from "@/data/lifeline/intelligence.json";
import nodesRaw from "@/data/lifeline/nodes.json";
import edgesRaw from "@/data/lifeline/relationships.json";

export const Route = createFileRoute("/lifeline")({
  head: () => ({ meta: [{ title: "LIFELINE — FinBridge" }] }),
  component: LifelinePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Event {
  title: string;
  summary: string;
  category: string;
  status: string;
  published_at: string;
  event_date: string;
  source_name: string;
  source_url: string;
  affected_variables: string[];
  potential_impacts: string[];
  exposed_groups: string[];
  time_horizon: string;
  evidence: string[];
  uncertainties: string[];
}

interface GraphNode {
  id: string;
  node_type: "event" | "economic_variable";
  label: string;
  category?: string;
  status?: string;
  geography?: string;
  source_record?: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship: string;
  pathway: string;
  evidence_status: string | string[];
  confidence: "high" | "medium" | "low";
  time_lag: string;
  supporting_event_ids?: string[];
  assumptions?: string[];
  caveats?: string[];
}

const events: Event[] = (intelligenceRaw as { events: Event[] }).events;
const graphNodes: GraphNode[] = (nodesRaw as { nodes: GraphNode[] }).nodes;
const graphEdges: GraphEdge[] = (edgesRaw as { edges: GraphEdge[] }).edges;

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
    confirmed:        { label: "Confirmed",        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",   Icon: CheckCircle2 },
    implemented:      { label: "Implemented",      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",    Icon: CheckCircle2 },
    announced:        { label: "Announced",        className: "bg-primary/10 text-primary",                                           Icon: Info },
    forecast:         { label: "Forecast",         className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", Icon: TrendingUp },
    "emerging signal":{ label: "Emerging signal",  className: "bg-lifeline/10 text-lifeline",                                         Icon: AlertTriangle },
  };
  const cfg = map[status.toLowerCase()] ?? { label: status, className: "bg-muted text-muted-foreground", Icon: Clock };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.className)}>
      <cfg.Icon className="h-3 w-3" aria-hidden />
      {cfg.label}
    </span>
  );
}

function confidenceColor(c: string) {
  if (c === "high")   return "#16a34a";
  if (c === "medium") return "#d97706";
  return "#9ca3af";
}

function normaliseEvidenceStatus(v: string | string[]): string {
  if (Array.isArray(v)) return v.join("; ") || "unspecified";
  return v || "unspecified";
}

const CATEGORY_SHORT: Record<string, string> = {
  "Government policy, taxation and public spending": "Policy",
  "Inflation, interest rates and household costs": "Inflation",
  "Petrol, diesel, gas and electricity prices": "Energy",
  "Employment, wages and AI-related job disruption": "Employment",
  "Housing, mortgages and rents": "Housing",
};

// ── Intelligence Card ─────────────────────────────────────────────────────────

function IntelligenceCard({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {statusBadge(event.status)}
              <span className="text-xs text-muted-foreground">
                {CATEGORY_SHORT[event.category] ?? event.category}
              </span>
              {event.event_date && (
                <span className="text-xs text-muted-foreground">
                  {event.event_date}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.summary}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4 text-sm">
          <div>
            <p className="text-foreground leading-relaxed">{event.summary}</p>
          </div>

          {event.potential_impacts.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Potential household impacts</h4>
              <ul className="space-y-1">
                {event.potential_impacts.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-lifeline">▸</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.exposed_groups.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Who may be affected</h4>
              <div className="flex flex-wrap gap-1">
                {event.exposed_groups.map((g, i) => (
                  <span key={i} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">{g}</span>
                ))}
              </div>
            </div>
          )}

          {event.time_horizon && (
            <div>
              <h4 className="font-semibold mb-1">Time horizon</h4>
              <p className="text-xs text-muted-foreground">{event.time_horizon}</p>
            </div>
          )}

          {event.evidence.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Evidence</h4>
              <ul className="space-y-1">
                {event.evidence.map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground">— {e}</li>
                ))}
              </ul>
            </div>
          )}

          {event.uncertainties.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10 p-3">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Uncertainties</h4>
              <ul className="space-y-1">
                {event.uncertainties.map((u, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400">— {u}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Source: {event.source_name} · Published {event.published_at}</span>
            {event.source_url && (
              <a href={event.source_url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                Source ↗
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// ── Consequence Graph ─────────────────────────────────────────────────────────

const SVG_W = 900;
const SVG_H = 640;
const EVT_X = 160;
const VAR_X = 740;
const EVT_R = 22;
const VAR_R = 16;

const eventNodes = graphNodes.filter((n) => n.node_type === "event");
const varNodes   = graphNodes.filter((n) => n.node_type === "economic_variable");

function nodePos(id: string): { x: number; y: number } | null {
  const ei = eventNodes.findIndex((n) => n.id === id);
  if (ei !== -1) {
    const y = 60 + ei * ((SVG_H - 120) / Math.max(eventNodes.length - 1, 1));
    return { x: EVT_X, y };
  }
  const vi = varNodes.findIndex((n) => n.id === id);
  if (vi !== -1) {
    const y = 40 + vi * ((SVG_H - 80) / Math.max(varNodes.length - 1, 1));
    return { x: VAR_X, y };
  }
  return null;
}

function ConsequenceGraph({
  highlighted,
  onSelectNode,
}: {
  highlighted: Set<string>;
  onSelectNode: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  const isHighlighted = highlighted.size > 0;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      return { ...t, scale: Math.min(3, Math.max(0.3, t.scale * delta)) };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging({ sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y });
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setTransform((t) => ({ ...t, x: dragging.ox + e.clientX - dragging.sx, y: dragging.oy + e.clientY - dragging.sy }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const fitView = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);
  const zoomIn  = useCallback(() => setTransform((t) => ({ ...t, scale: Math.min(3, t.scale * 1.2) })), []);
  const zoomOut = useCallback(() => setTransform((t) => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) })), []);

  function selectNode(id: string) {
    setSelectedEdge(null);
    setSelectedNode((prev) => prev === id ? null : id);
    onSelectNode(id);
  }

  function selectEdge(edge: GraphEdge) {
    setSelectedNode(null);
    setSelectedEdge((prev) => prev?.id === edge.id ? null : edge);
  }

  const selectedEdges = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set(graphEdges.filter((e) => e.from === selectedNode || e.to === selectedNode).map((e) => e.id));
  }, [selectedNode]);

  const dim = (id: string) => isHighlighted && !highlighted.has(id);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-primary" /> World event
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-lifeline" /> Economic variable
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-5 rounded bg-green-500" /> High confidence
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-5 rounded bg-amber-500" /> Medium
          </span>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={zoomOut} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={zoomIn}  className="rounded-lg p-1.5 hover:bg-accent" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={fitView} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Fit view"><Maximize2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden h-[500px] cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "top left", width: SVG_W, height: SVG_H }}
        >
          {/* Column labels */}
          <text x={EVT_X} y={28} textAnchor="middle" className="fill-muted-foreground text-xs" fontSize={11} fontWeight={600}>World events</text>
          <text x={VAR_X} y={28} textAnchor="middle" className="fill-muted-foreground text-xs" fontSize={11} fontWeight={600}>Economic variables</text>

          {/* Edges */}
          {graphEdges.map((edge) => {
            const from = nodePos(edge.from);
            const to   = nodePos(edge.to);
            if (!from || !to) return null;
            const isSelected = selectedEdge?.id === edge.id;
            const inSelectedNode = selectedEdges.has(edge.id);
            const dimEdge = isHighlighted
              ? !(highlighted.has(edge.from) && highlighted.has(edge.to))
              : (selectedNode ? !inSelectedNode : false);
            const color = confidenceColor(edge.confidence);
            return (
              <path
                key={edge.id}
                d={`M ${from.x + EVT_R} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x - VAR_R} ${to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={isSelected || inSelectedNode ? 2.5 : 1.2}
                strokeOpacity={dimEdge ? 0.1 : (isSelected || inSelectedNode ? 1 : 0.55)}
                className="cursor-pointer transition-all"
                onClick={() => selectEdge(edge)}
              />
            );
          })}

          {/* Event nodes */}
          {eventNodes.map((node) => {
            const pos = nodePos(node.id)!;
            const isSelected = selectedNode === node.id;
            const dimNode = dim(node.id);
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node.id)}>
                <circle
                  cx={pos.x} cy={pos.y} r={EVT_R}
                  className="fill-primary transition-all"
                  opacity={dimNode ? 0.15 : 1}
                  stroke={isSelected ? "white" : "transparent"}
                  strokeWidth={2}
                />
                <text
                  x={pos.x - EVT_R - 6} y={pos.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={9}
                  opacity={dimNode ? 0.2 : 0.9}
                  className="fill-foreground pointer-events-none select-none"
                >
                  {node.id}
                </text>
              </g>
            );
          })}

          {/* Variable nodes */}
          {varNodes.map((node) => {
            const pos = nodePos(node.id)!;
            const isSelected = selectedNode === node.id;
            const dimNode = dim(node.id);
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node.id)}>
                <circle
                  cx={pos.x} cy={pos.y} r={VAR_R}
                  className="fill-lifeline transition-all"
                  opacity={dimNode ? 0.15 : 1}
                  stroke={isSelected ? "white" : "transparent"}
                  strokeWidth={2}
                />
                <text
                  x={pos.x + VAR_R + 6} y={pos.y}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={9}
                  opacity={dimNode ? 0.2 : 0.9}
                  className="fill-foreground pointer-events-none select-none"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {(selectedNode || selectedEdge) && (
        <div className="border-t border-border bg-background p-4">
          {selectedNode && (() => {
            const node = graphNodes.find((n) => n.id === selectedNode)!;
            const edges = graphEdges.filter((e) => e.from === selectedNode || e.to === selectedNode);
            const isEvent = node.node_type === "event";
            return (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1", isEvent ? "bg-primary/10 text-primary" : "bg-lifeline/10 text-lifeline")}>
                      {isEvent ? "World event" : "Economic variable"}
                    </span>
                    <h4 className="font-semibold text-sm">{node.label}</h4>
                    {node.status && <p className="text-xs text-muted-foreground">Status: {node.status}</p>}
                  </div>
                  <button type="button" onClick={() => { setSelectedNode(null); onSelectNode(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                {edges.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Connections ({edges.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {edges.map((e) => {
                        const otherId = e.from === selectedNode ? e.to : e.from;
                        const other = graphNodes.find((n) => n.id === otherId);
                        return (
                          <span key={e.id} className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs">
                            <span style={{ color: confidenceColor(e.confidence) }}>●</span>
                            {otherId}: {other?.label.slice(0, 30)}…
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {selectedEdge && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm">{selectedEdge.from} → {selectedEdge.to}: {selectedEdge.relationship}</h4>
                <button type="button" onClick={() => setSelectedEdge(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground">{selectedEdge.pathway}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span>Confidence: <strong style={{ color: confidenceColor(selectedEdge.confidence) }}>{selectedEdge.confidence}</strong></span>
                <span>Time lag: {selectedEdge.time_lag}</span>
                <span>Evidence: {normaliseEvidenceStatus(selectedEdge.evidence_status)}</span>
              </div>
              {selectedEdge.assumptions && selectedEdge.assumptions.length > 0 && (
                <p className="text-xs text-muted-foreground">Assumption: {selectedEdge.assumptions[0]}</p>
              )}
              {selectedEdge.caveats && selectedEdge.caveats.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">Caveat: {selectedEdge.caveats[0]}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Impact Explorer ───────────────────────────────────────────────────────────

function ImpactExplorer() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [graphHighlight, setGraphHighlight] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Compute which nodes are reachable from selected events
      const reachable = new Set<string>(next);
      graphEdges.forEach((e) => { if (next.has(e.from)) reachable.add(e.to); });
      setGraphHighlight(next.size > 0 ? reachable : new Set());
      return next;
    });
  }

  const affectedVars = useMemo(() => {
    if (selected.size === 0) return [];
    const varMap = new Map<string, { node: GraphNode; edges: GraphEdge[] }>();
    graphEdges.forEach((e) => {
      if (selected.has(e.from)) {
        const varNode = graphNodes.find((n) => n.id === e.to);
        if (varNode) {
          if (!varMap.has(e.to)) varMap.set(e.to, { node: varNode, edges: [] });
          varMap.get(e.to)!.edges.push(e);
        }
      }
    });
    return [...varMap.values()];
  }, [selected]);

  return (
    <div className="space-y-6">
      <ConsequenceGraph highlighted={graphHighlight} onSelectNode={() => {}} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-1">Select events to explore connected pathways</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Events selected below are highlighted in the graph above. Pathways show candidate analytical connections, not proven causal relationships.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {eventNodes.map((node) => (
            <label key={node.id} className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
              <input
                type="checkbox"
                checked={selected.has(node.id)}
                onChange={() => toggle(node.id)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="text-xs font-mono text-muted-foreground">{node.id}</span>
                <p className="text-xs font-medium">{node.label}</p>
              </div>
            </label>
          ))}
        </div>

        {affectedVars.length > 0 && (
          <div className="mt-5">
            <h4 className="font-semibold text-sm mb-3">Variables that may be affected ({affectedVars.length})</h4>
            <div className="space-y-3">
              {affectedVars.map(({ node, edges }) => (
                <div key={node.id} className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-lifeline font-semibold">{node.id}</span>
                    <span className="text-sm font-medium">{node.label}</span>
                  </div>
                  <div className="space-y-1">
                    {edges.map((e) => (
                      <div key={e.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span style={{ color: confidenceColor(e.confidence) }} className="shrink-0 font-bold">●</span>
                        <span><strong>{e.from}</strong> {e.relationship}: {e.pathway}</span>
                      </div>
                    ))}
                    {edges.length > 1 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        Multiple pathways converge here — effects should not be simply added together.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prepare Section ───────────────────────────────────────────────────────────

const PREPARE_STEPS = [
  { heading: "Energy and utilities", text: "Check whether you are eligible for the Household Energy Payment (council-tax bands A–D in England) and review your energy tariff against the new Ofgem cap. Consider comparing tariff options if you are off the cap." },
  { heading: "Mortgage and rent", text: "If you are on a fixed-rate mortgage due to expire, review your options now — rates have risen. If renting, be aware that average UK rents grew 3.8% in the year to August 2026." },
  { heading: "Borrowing costs", text: "The Bank Rate is now 4%. Check the rate on any variable-rate debt. Avoid taking on new credit if your monthly cash flow is already stretched." },
  { heading: "Income resilience", text: "If your work is task-based or susceptible to automation, consider whether further skills or qualifications could protect your earnings. The OBR flags AI as an emerging disruption risk." },
  { heading: "Fuel and transport", text: "The 5p fuel-duty cut runs until July 2027. If your household relies heavily on a car, this may partially offset cost-of-living pressures in the near term." },
];

function PrepareSection() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold mb-1">Prepare for the future</h3>
      <p className="text-xs text-muted-foreground mb-4">
        These are general questions and steps drawn from the analysed events. They are possibilities to explore, not financial advice. Eligibility and outcomes depend on individual circumstances.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PREPARE_STEPS.map((s) => (
          <div key={s.heading} className="rounded-xl border border-border bg-background p-4">
            <h4 className="text-sm font-semibold mb-1">{s.heading}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        These scenarios are possibilities, not certainties. All assumptions are based on publicly available data and analytical pathways, not personal advice.
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CATEGORIES = [...new Set(events.map((e) => e.category))];

type Tab = "feed" | "explorer" | "prepare";

function LifelinePage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = categoryFilter
    ? events.filter((e) => e.category === categoryFilter)
    : events;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="h-1 bg-primary" />

      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-lifeline mb-2">LIFELINE</p>
          <h1 className="font-serif text-3xl font-bold text-heading mb-3">
            Predict the world. Understand the impact. Prepare for the future.
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            LIFELINE connects global economic developments and world events to their potential effects on household finances — so you can see what might be coming and take sensible steps.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Relationships shown are candidate analytical pathways, not proven causal links. Evidence status, confidence and caveats are drawn directly from the source data. This is not financial advice.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-5 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
          {([
            ["feed", "Intelligence feed"],
            ["explorer", "Consequence graph & impact explorer"],
            ["prepare", "Prepare for the future"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Intelligence feed */}
        {tab === "feed" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  categoryFilter === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}
              >
                All ({events.length})
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    categoryFilter === cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}
                >
                  {CATEGORY_SHORT[cat] ?? cat}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map((event, i) => (
                <IntelligenceCard key={i} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Explorer (graph + impact) */}
        {tab === "explorer" && <ImpactExplorer />}

        {/* Prepare */}
        {tab === "prepare" && <PrepareSection />}
      </div>
    </div>
  );
}
