# FinBridge support knowledge

This is a small, curated retrieval layer for the hackathon demo. It is **not** a live benefits database and does not decide eligibility. The five records in `sources.json` were checked against their providers' pages on 7 November 2026. Their summaries are paraphrases, not copied page text.

## Source coverage

| Record | Use when |
| --- | --- |
| Manchester Unexpected Financial Needs Fund | A University of Manchester student has a projected shortfall or unexpected essential expense. |
| Manchester estranged student support | The student explicitly confirms they lack family support or are estranged. Do not infer eligibility from that statement. |
| Manchester Students' Union Advice Service | A Manchester student needs human advice on money, rent, debt, or housing. |
| NatWest help with money worries | A customer is concerned about bank payments, an overdraft, or broader money worries. |
| MoneyHelper student budgeting | A student needs general budgeting guidance, including irregular income. |

Manchester-only records are excluded unless the request explicitly says `"university": "University of Manchester"` or `"Manchester"`. The dedicated estranged-student record requires `"noFamilySupport": true`; do not guess this sensitive status from chat text. Other university users receive only broadly applicable records. The retrieval code returns at most three entries; every entry includes its real provider URL and a caution about eligibility.

## n8n handoff

Create these nodes in order:

1. **Webhook** (`POST`), named exactly `Webhook`. Accept the request below.
2. **HTTP Request** (`GET`) for `https://raw.githubusercontent.com/tmammadov17503/FinBridge_GUH/main/knowledge/sources.json`, response format JSON. The file must be pushed to GitHub before this works.
3. **Code**, run once for all items. Paste the complete contents of `n8n-retrieve.js`. Its input is the HTTP Request output. It reads the original request from the named Webhook node.
4. Use n8n's **Anthropic** node, **Text → Message a Model**, with the supplied hackathon API key stored as an n8n credential. Start with `claude-sonnet-4-6` if it is available in the account. Pass `supportSources` alongside the independently calculated forecast. The model explains; it does not calculate or select URLs.
5. Return the `supportSources` array unchanged to the website, so the UI builds source cards from trusted catalogue URLs rather than model-generated links.

Example input to the Webhook:

```json
{
  "question": "What if I lose two shifts and cannot pay rent?",
  "university": "University of Manchester",
  "noFamilySupport": true,
  "shortfall": true
}
```

The Code node returns the original request plus `supportSources` and `catalogueCheckedAt`. If the GitHub fetch fails during the live demo, use a static JSON copy of `sources.json` in an n8n Edit Fields node. The forecast and text chat should still work if retrieval is unavailable.

## Claude instruction to add after retrieval

> You are FinBridge, a calm financial support guide. Explain only the forecast numbers supplied by the calculation node. For support options, use only the provided `supportSources`. Name each provider and source ID you rely on. Never invent a grant, amount, eligibility decision, bank action, or URL. Say that eligibility and awards are decided by the provider. If a relevant source is missing, say you cannot verify an option and suggest contacting the student's own university support team. Keep the answer under 90 words. Draft messages are for the student to review; never send them.

Ask the model for structured output: `explanation`, `suggestedNextStep`, `sourceIds`, and `editableDraft`. Reject any `sourceIds` not found in the retrieved records. Show actual source cards separately from model text.

## Local check

Run `node --test knowledge/retrieve.test.mjs` from the repository root. `retrieve.mjs` is the locally testable reference implementation; `n8n-retrieve.js` is the paste-ready Code node version.
