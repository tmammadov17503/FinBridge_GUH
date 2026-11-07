# FinBridge

**A financial safety net for people whose income does not arrive on the same day every month.**

Zero-hours workers, agency staff and students on termly loans are asked to budget with tools built for
a fixed monthly salary. FinBridge answers the two questions those tools cannot: *am I going to run short
before my next payday*, and *what can I actually do about it today*.

Built at Great Uni Hack, Manchester.

## How it works

```
Website chat widget ─┐                         ┌─> get_financial_forecast ──> deterministic forecast engine
ElevenLabs voice ────┼─> POST /finbridge/chat ─┤        (pure JS maths, no model involved)
(server tool)        ┘   [Claude agent+memory] └─> search_knowledge_base ───> curated support catalogue
```

Three parts:

1. **A forecast engine.** Given a user and a horizon, it computes current balance, monthly income,
   outgoings and surplus, buffer days, safe-to-spend-per-day until the next income, and spend by
   category. It then runs four scenarios — `base`, `income_dip`, `unexpected_cost` and `perfect_storm` —
   each returning a weekly balance curve, the first overdraft day and the lowest balance, alongside
   risk flags, nudges and the assumptions it used.
2. **A curated support catalogue.** Real, hand-checked support providers with their own URLs, filtered
   and ranked against the user's situation. See [knowledge/](knowledge/).
3. **Two front doors.** A website chat widget and an ElevenLabs voice agent, both calling a single n8n
   webhook that runs a Claude agent with conversation memory and the two tools above.

## The design rule

**The model explains. It never calculates, decides or invents.**

Money advice is a bad place for a confident guess, and the people this is built for can least afford one.
So every consequential step is taken out of the model's hands:

- **The LLM never does the arithmetic.** The finance engine computes every number; the agent puts those
  numbers into plain English and states the assumptions behind them.
- **The LLM never picks a link.** Retrieval returns entries from the trusted catalogue. Any `sourceIds`
  the model returns that are not in the retrieved set are rejected, and the UI builds its source cards
  from the catalogue rather than from model text.
- **Sensitive status is never inferred.** Support for estranged students is only surfaced when the person
  has explicitly confirmed it via a `noFamilySupport` flag. Saying the words in chat is not consent, and
  there is a test asserting exactly that.
- **No eligibility claims.** Every catalogue record carries a caution that the provider decides, and a
  test asserts none can be returned without one.
- **User text is data, never instructions.** Questions are length-bounded and tokenised for tag matching
  only; an attempt to talk the retriever into promising a grant changes nothing about what it returns.
- **Drafts are for the user to send.** Any message FinBridge drafts is editable and is never sent on
  someone's behalf.

The result is financial triage you can audit end to end: deterministic maths, human-verified referrals,
and a language model confined to the narration layer.

## Repository layout

| Path | What it is |
| --- | --- |
| [knowledge/](knowledge/) | The support catalogue, its retrieval logic, and tests. See its [README](knowledge/README.md) for the n8n handoff. |
| [knowledge/sources.json](knowledge/sources.json) | Curated providers with real URLs, tags, eligibility gates and cautions. |
| [knowledge/retrieve.mjs](knowledge/retrieve.mjs) | Reference retrieval implementation, locally testable. |
| [knowledge/n8n-retrieve.js](knowledge/n8n-retrieve.js) | Paste-ready n8n Code node version of the same logic. |
| [knowledge/retrieve.test.mjs](knowledge/retrieve.test.mjs) | Tests covering ranking, eligibility gating and injection resistance. |
| [n8n-agent-architecture.md](n8n-agent-architecture.md) | The agent layer: workflow setup, the full API contract, and the ElevenLabs voice route. |

## Running the tests

No dependencies, no install step. From the repository root:

```bash
node --test knowledge/retrieve.test.mjs
```

## API contract

Full detail in [n8n-agent-architecture.md](n8n-agent-architecture.md). In short:

- **`POST /webhook/finbridge/chat`** — `{ message, userId, sessionId?, channel? }` → `{ reply, sessionId, userId }`.
  Set `channel: "voice"` for short, spoken-style answers.
- **`POST /webhook/finbridge/forecast`** — `{ userId, horizonDays? }` → the full forecast object. No LLM
  involved, so the dashboard can call this directly to drive charts.
- **`POST /webhook/finbridge/kb/ingest`** — `{ title, text, source? }` → adds a document to the retrieval store.

Demo personas: `demo-amira` (zero-hours single parent, medium risk), `demo-josh` (student on a termly
loan), `demo-priya` (stable salary saver, low risk).

## Status

This is a hackathon prototype under active development. Landed and tested: the support catalogue and its
retrieval layer, and the forecast endpoint end to end. Work in progress:

- The n8n workflow JSON, prompts and knowledge-base seeding described in the architecture doc are not yet
  in this repository.
- Two retrieval paths exist — an in-memory vector store and the fetch-and-score Code node — and have not
  yet been reconciled into one.
- User data is generated demo personas. Swapping in a mock bank, Open Banking API or user-uploaded CSV
  means replacing one node with the same output shape.
- The in-memory vector store is wiped on n8n restart; a hosted store is the fix for persistence.
- Webhooks are currently open (`allowedOrigins: *`, no auth). Header auth and origin restriction are
  required before any public demo.

## Disclaimer

FinBridge is a prototype. It is not a bank, a benefits checker or a regulated financial adviser, it does
not decide anyone's eligibility for anything, and it is not affiliated with any provider listed in its
catalogue. Eligibility and awards are decided by the providers themselves. The catalogue holds general UK
guidance written for a hackathon; it should be reviewed before being presented to anyone as advice.
