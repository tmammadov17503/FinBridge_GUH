# FinBridge.

FinBridge is a hackathon prototype for helping students understand cash shortfalls and find relevant support. The current implementation has a website skeleton, a published n8n demo workflow, and two separate knowledge collections. It is **not** a bank, benefits checker, eligibility decision maker, or regulated financial adviser.

## What works now

| Part | Current state |
| --- | --- |
| [`frontend/`](frontend/) | Lovable-built responsive UI skeleton with navigation and placeholder chat. No live API integration yet. |
| [`n8n/`](n8n/) | Source-controlled snapshot of the published **FinBridge Demo** workflow: graph JSON, four Code node files, tests, and import notes. |
| [`knowledge/sources.json`](knowledge/sources.json) | Five curated student and money-support links used by the live workflow. |
| [`knowledge/lifeline/`](knowledge/lifeline/) | Team-contributed LIFELINE event, support-option, and community datasets. These are not yet connected to the live workflow. |

The live `POST /webhook/finbridge/chat` workflow accepts caller-supplied GBP finance data, validates dates and amounts, computes the forecast in pence, selects up to three links from the pinned catalogue, and uses Anthropic only to choose a draft focus. Explanation and draft copy are assembled from deterministic templates. Invalid input returns HTTP 400; catalogue or Anthropic errors return the forecast with explicit fallback statuses. The exact payload and response are in the [knowledge contract](knowledge/README.md).

The workflow export omits credentials and is inactive on import. The live workflow is [FinBridge Demo](https://tagihan.app.n8n.cloud/workflow/GAoLt3qT4DfDC1f2). Its public webhook is for **synthetic demo inputs only** until a protected website server route and rate limiting are added. The workflow is configured not to save execution payloads.

## Local checks

```powershell
node --test knowledge/retrieve.test.mjs n8n/workflow.test.mjs
```

The repository also contains a [proposed broader agent architecture](n8n-agent-architecture.md). That document describes future chat memory, separate forecast and knowledge-ingest workflows, voice, and vector retrieval; those are **not** implemented in the live workflow.

## Next steps

1. Connect the [`frontend/`](frontend/) chat and forecast UI to the documented API through a server-side route. Add inbound protection and rate limiting before accepting personal finance data. Follow [`frontend/AGENTS.md`](frontend/AGENTS.md) and Lovable's project boundaries when editing the UI.
2. Decide how the three LIFELINE datasets should be retrieved. Keep events, support options, and aggregate community indicators distinct; validate provenance, geography, time, and eligibility before showing them. The current five-link catalogue stays separate until that design is tested.
3. Add realistic finance input and scenario editing to the website. The live workflow calculates only from the transactions supplied in each request; it has no bank connection or stored customer profile.
4. If needed, implement the proposed voice route, conversational memory, and broader agent workflows in separate reviewed iterations. The current webhook does not provide those contracts.

No model-generated grant, eligibility promise, or source link should be presented as fact. Provider rules and awards are decided by providers; source records must be rechecked before high-stakes use.
