# FinBridge Demo n8n workflow

This folder is the source-controlled snapshot of the **published** [FinBridge Demo workflow](https://tagihan.app.n8n.cloud/workflow/GAoLt3qT4DfDC1f2) (ID `GAoLt3qT4DfDC1f2`, version `148d9f7c-f502-4f2c-8cb2-2e33f4aacf51`). It contains the credential-free workflow export, all four Code node sources, and their workflow tests. The request and response contract is in [`knowledge/README.md`](../knowledge/README.md).

| File | Node or role |
| --- | --- |
| `finbridge-demo.workflow.json` | Importable graph snapshot; deliberately inactive and without credentials |
| `validate-finance.js` | Validate and normalize the webhook body |
| `forecast.js` | Calculate balances from supplied transactions |
| `retrieve.js` | Select at most three approved support sources |
| `finalize.js` | Construct explanation, safe draft, and response |
| `workflow.test.mjs` | Local Code node contract tests |

The graph is: Webhook → Validate finance input → Route valid input → Calculate forecast → Fetch support catalogue → Select support sources → Anthropic classification → Validate response → Respond to Webhook. Invalid input goes directly to a separate HTTP 400 response. Catalogue and Anthropic nodes continue on error so the forecast still returns with explicit status fields.

To import a **new copy** into n8n, import `finbridge-demo.workflow.json`, attach an Anthropic credential to **Explain and draft request**, review the webhook path (the published workflow already uses `/finbridge/chat`), then publish only after testing. The export omits credential IDs and is inactive so importing it does not overwrite or activate the live workflow. The model only selects `rent`, `budget`, or `general`; it never supplies figures, copy, or links to the response.

Run `node --test knowledge/retrieve.test.mjs n8n/workflow.test.mjs` from the repository root. These files mirror the published Code nodes as of the version above; later n8n edits must be copied back and tested before committing. The catalogue fetch is pinned to a reviewed Git commit. The public webhook remains suitable for synthetic demos only until a protected website server route and rate limiting are added.
