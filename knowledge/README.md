# FinBridge support knowledge

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
  }
}
```

The request requires real ISO dates, GBP amounts with at most two decimals, a loan date within 366 days, at most 100 transactions, and a weekly essentials amount. `question` is optional (up to 500 characters), `university` is optional (up to 100), and `noFamilySupport` must be an explicit boolean. Invalid requests return HTTP 400 with `error.code = "INVALID_INPUT"`. Transactions on or after the loan date are rejected; supply reduced wages as transaction amounts to test a lost-shifts scenario.

The successful response contains `forecast`, `explanation`, `draft`, `supportSources`, `supportStatus`, `draftStatus`, and `catalogueCheckedAt`. Forecast arithmetic uses pence. Explanation, draft text, and URLs are built by deterministic code. Anthropic can only select the `rent`, `budget`, or `general` draft focus. If catalogue retrieval fails, the response has `supportStatus: "unavailable"` and no sources. If Anthropic fails or returns another value, `draftStatus: "fallback"` and a general draft are returned. Neither failure drops the forecast.

The deployed Code node sources and credential-free workflow export are in [`n8n/`](../n8n/). The catalogue URL is pinned to repository commit `35698fd54ebba2e1c6052c0e579c0ac8614aa5b1` so approved links cannot change with the main branch. The workflow disables saved execution data for financial payloads. The public webhook still needs inbound authentication and rate limiting before it should receive personal financial records.

## Local check

Run `node --test knowledge/retrieve.test.mjs n8n/workflow.test.mjs` from the repository root. `retrieve.mjs` is the locally testable retrieval reference; the files under `n8n/` are paste-ready Code node sources.
