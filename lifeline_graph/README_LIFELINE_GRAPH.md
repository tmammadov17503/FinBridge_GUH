# LIFELINE Personal — Financial Consequence Graph

## Purpose

This folder contains the structured data used by the **LIFELINE Personal Financial Consequence Graph** in the FinBridge frontend.

The graph helps users explore how world events and economic developments may connect to economic variables and potential household financial pressures.

**This folder is for the frontend graph experience. It is not a chatbot knowledge base.** The chatbot's separate datasets are stored in `lifeline_knowledge/`.

## Files

| File | Purpose |
|---|---|
| `lifeline_nodes.json` | The graph's nodes: events, economic variables and other concepts in a potential financial-impact pathway. |
| `lifeline_relationships.json` | The directed connections between nodes, including explanations and available evidence/uncertainty metadata. |

Current prototype snapshot:
- 27 nodes
- 25 relationships

These counts describe the current starter files. They may change as the graph is reviewed and extended.

## How the frontend should use these files

The frontend (under `frontend/`) should:

1. Load the two JSON files as data.
2. Create one visual graph node for each record in `lifeline_nodes.json`.
3. Create one directed visual edge for each record in `lifeline_relationships.json`.
4. Match each relationship's source and target identifiers to existing node identifiers.
5. Display the relevant node or relationship details when a user selects an item.
6. Preserve evidence labels, confidence, time lag, assumptions and caveats when those fields are present.
7. Show a clear fallback such as **“Not specified”** when optional metadata is missing.

A graph library such as React Flow (`@xyflow/react`) can render the nodes, edges, zoom, pan and selection interactions.

The frontend should not assume that the JSON is a live feed. These are local, version-controlled prototype data files unless a future implementation adds a data service.

## Interpreting nodes and relationships

### Nodes

Nodes represent entities or concepts in the financial-impact system. Depending on the record's category/type, a node may represent:

- A world or policy event.
- An economic variable, such as fuel prices, inflation or mortgage costs.
- A household financial pressure or potential outcome.

Use the type/category and description stored in each record to determine its visual style and explanatory text. Do not infer a type from the node title alone if the record already supplies a type/category.

### Relationships

Relationships represent a possible connection or pathway between two nodes.

The frontend should use the relationship's stored source and target identifiers to connect the correct nodes. The relationship description explains the proposed mechanism.

Where available, show:
- Relationship type or description.
- Evidence status / evidence basis.
- Confidence.
- Time lag.
- Supporting event IDs or sources.
- Assumptions.
- Caveats and limitations.

Do not turn a relationship into a claim of proven causation merely because it is drawn as an arrow.

## Evidence and uncertainty rules

The current relationships are a **curated prototype set of candidate analytical pathways**. They are not all independently verified causal findings.

The application must:

- Distinguish source-supported information from analytical hypotheses and general economic relationships.
- Never invent evidence, confidence scores, time lags or supporting sources.
- Preserve the exact evidence-status wording in the data.
- Treat confidence as the strength of support for an individual relationship, not as a probability that a whole household outcome will happen.
- Use cautious language such as “may contribute to”, “could affect” and “under this scenario”.
- Display assumptions and caveats where available.
- Make clear that multiple factors can influence the same economic variable.

## Avoid double-counting

Several events may affect the same underlying pressure. For example, a fuel-price movement and a fuel-duty change may both influence pump prices.

Do not add the impacts of connected pathways together as if they were independent costs. If a future simulator combines effects, it must account for shared variables, overlapping mechanisms, units, baselines and timing.

## Data maintenance

When updating the graph:

1. Keep node identifiers stable wherever possible.
2. Ensure every relationship's source and target identifiers refer to existing nodes.
3. Remove or update relationships when a referenced node is renamed or retired.
4. Keep source references and supporting event identifiers traceable to their source records.
5. Validate the JSON syntax and cross-file references before committing.
6. Review material changes to evidence status, confidence, assumptions and caveats.
7. Commit changes to Git so the team can review and recover previous versions.

Do not silently overwrite historical evidence or make unsupported changes to relationships.

## Validation checklist

Before merging a graph-data update, check:

- [ ] Both JSON files parse successfully.
- [ ] Every node has a unique identifier.
- [ ] Every relationship has a unique identifier (if the schema provides one).
- [ ] Every relationship source and target refers to an existing node.
- [ ] No relationship is duplicated unintentionally.
- [ ] Evidence status, confidence and time lag are not fabricated.
- [ ] Assumptions and caveats are retained.
- [ ] The frontend handles missing optional fields safely.
- [ ] The graph does not imply that a hypothesis is proven causation.

## Scope and limitations

This is a hackathon/prototype dataset. It is not a validated macroeconomic forecasting model, a personal financial assessment, or a guarantee that an event will produce a particular household outcome.

The graph is intended to make possible pathways understandable and explorable. Any personal scenario should state its assumptions, show uncertainty and avoid presenting illustrative calculations as guaranteed forecasts.

## Relationship to the rest of the repository

- `lifeline_graph/` — graph data for the LIFELINE Personal interactive graph.
- `lifeline_knowledge/` — separate chatbot-oriented datasets for Personal intelligence, Finding Money and Communities.
- `frontend/` — the user-facing application that can load and visualise the graph data.

The graph data does not need to be ingested into the chatbot unless a future product requirement explicitly calls for that.
