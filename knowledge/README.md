# FinBridge support knowledge

This folder contains two separate knowledge collections. `sources.json` is the five-record catalogue used by the **currently published** n8n demo workflow. [`lifeline/`](lifeline/) contains the three broader LIFELINE datasets contributed by the team: events, finding-money support options, and community indicators. Their schemas and verification status differ. The live workflow does **not** yet retrieve from LIFELINE; see its [agent README](lifeline/README_LIFELINE_KNOWLEDGE_BASE.md) before designing that integration.

This is a small, curated retrieval layer for the hackathon demo. It is **not** a live benefits database and does not decide eligibility. The five records in `sources.json` were checked against their providers' pages on 7 November 2026. Their summaries are paraphrases, not copied page text.

## Source coverage

| Record | Use when |
| --- | --- |
| Manchester Unexpected Financial Needs Fund | A University of Manchester student has a projected shortfall or unexpected essential expense. |
| Manchester estranged student support | The student explicitly confirms they lack family support or are estranged. Do not infer eligibility from that statement. |
| Manchester Students' Union Advice Service | A Manchester student needs human advice on money, rent, debt, or housing. |
| NatWest help with money worries | A customer is concerned about bank payments, an overdraft, or broader money worries. |
| Student Minds student budgeting | A student needs general guidance on loan payments, wages, and essential costs. |

Manchester-only records are excluded unless the request explicitly says `"university": "University of Manchester"` or `"Manchester"`. The dedicated estranged-student record requires `"noFamilySupport": true`; do not guess this sensitive status from chat text. Other university users receive only broadly applicable records. The retrieval code returns at most three entries; every entry includes its real provider URL and a caution about eligibility.

## Webhook contract

### Authentication

Send `X-FinBridge-Key: <secret>` with every request. Configure this in two places:

1. **n8n Webhook node** — open the node, set Authentication to **Header Auth**, create a credential with Name `X-FinBridge-Key` and your chosen secret value. n8n rejects requests without it before the Code node runs. No enterprise plan required.
2. **Lovable Secrets** — add `FINBRIDGE_WEBHOOK_SECRET = <same secret>`. The server function reads it and sends the header on every request.

Requests with a missing or wrong key are rejected by n8n with a 401 before reaching the workflow.

### Request

`POST /webhook/finbridge/chat` accepts one JSON object. All figures are supplied by the caller; there is no demo student or hidden estimate. Income is a positive transaction amount and spending is negative. The question selects a draft focus and relevant support sources, but never changes the numbers.

```json
{
  "question": "Can I cover rent before my loan?",
  "university": "University of Manchester",
  "noFamilySupport": false,
  "finance": {
    "startDate": "2026-11-07",
    "openingBalance": 200,
    "nextMaintenanceLoanDate": "2026-12-05",
    "transactions": [
      { "date": "2026-11-14", "amount": 100, "label": "Wages" },
      { "date": "2026-12-01", "amount": -300, "label": "Rent" }
    ],
    "weeklyEssentials": { "firstDate": "2026-11-09", "amount": 20 }
  },
  "scenarioB": {
    "transactions": [
      { "date": "2026-11-14", "amount": 50, "label": "Wages (reduced)" },
      { "date": "2026-12-01", "amount": -300, "label": "Rent" }
    ],
    "weeklyEssentials": { "firstDate": "2026-11-09", "amount": 20 }
  }
}
```

`question` is optional (up to 500 characters), `university` is optional (up to 100), `noFamilySupport` must be an explicit boolean. `scenarioB` is optional — when provided, it runs a parallel forecast using the same `startDate`, `openingBalance`, and `nextMaintenanceLoanDate` as the base but with its own `transactions` and `weeklyEssentials`. Use it to show a "lost shifts" comparison chart. The request requires real ISO dates, GBP amounts with at most two decimals, a loan date within 366 days, and at most 100 transactions per scenario. Invalid requests return HTTP 400 with `error.code = "INVALID_INPUT"`. Transactions on or after the loan date are rejected.

### Response

```json
{
  "forecast": {
    "currency": "GBP",
    "scenario": "provided_transactions",
    "startDate": "2026-11-07",
    "openingBalance": 200,
    "nextMaintenanceLoanDate": "2026-12-05",
    "lowestBalance": -80,
    "lowestBalanceDate": "2026-12-01",
    "firstShortfallDate": "2026-12-01",
    "firstShortfallAmount": -80,
    "hasShortfall": true,
    "balanceBeforeNextLoan": -80,
    "dailySeries": [
      { "date": "2026-11-07", "balance": 200 },
      { "date": "2026-11-08", "balance": 200 }
    ],
    "timeline": [
      { "date": "2026-11-09", "label": "Weekly essentials", "amount": -20, "balance": 180 }
    ],
    "scenarios": {
      "base":    { "lowestBalance": -80,  "firstShortfallDate": "2026-12-01", "firstShortfallAmount": -80,  "hasShortfall": true, "balanceBeforeNextLoan": -80,  "dailySeries": [] },
      "changed": { "lowestBalance": -130, "firstShortfallDate": "2026-11-28", "firstShortfallAmount": -50, "hasShortfall": true, "balanceBeforeNextLoan": -130, "dailySeries": [] }
    }
  },
  "explanation": "Your projected lowest balance is -£80.00 on 2026-12-01. Your first projected shortfall is on 2026-12-01 (-£80.00). ...",
  "draft": "Hello, I would like to discuss my financial situation...",
  "supportSources": [{ "id": "...", "title": "...", "provider": "...", "url": "https://...", "summary": "...", "actionLabel": "...", "caution": "..." }],
  "supportStatus": "ok",
  "draftStatus": "model",
  "catalogueCheckedAt": "2026-11-07"
}
```

`dailySeries` has one entry per calendar day from `startDate` to the day before `nextMaintenanceLoanDate` — ready to plot as a balance chart. `firstShortfallAmount` is the balance on the first shortfall day (always negative). `scenarios` is present only when `scenarioB` was sent; both `base` and `changed` include their own `dailySeries` with the same dates so they can be drawn as two chart lines. `draftStatus` is `"model"` when Anthropic classified successfully and `"fallback"` when it did not — the forecast is returned either way. If catalogue retrieval fails, `supportStatus` is `"unavailable"` and `supportSources` is empty.

The deployed Code node sources and credential-free workflow export are in [`n8n/`](../n8n/). The catalogue URL is pinned to repository commit `35698fd54ebba2e1c6052c0e579c0ac8614aa5b1`. The workflow disables saved execution data for financial payloads.

## Local check

Run `node --test knowledge/retrieve.test.mjs n8n/workflow.test.mjs` from the repository root. `retrieve.mjs` is the locally testable retrieval reference; the files under `n8n/` are paste-ready Code node sources.
