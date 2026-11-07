# FinBridge – n8n agent layer

Three importable workflows (in `workflows/`) that back the website chatbot and the ElevenLabs voice assistant.

```
Website chat widget ─┐                         ┌─> get_financial_forecast ──> POST /webhook/finbridge/forecast
ElevenLabs voice ────┼─> POST /finbridge/chat ─┤        (Load User Data -> Forecast Engine, pure JS maths)
(server tool)        ┘   [Claude agent+memory] └─> search_knowledge_base ───> in-memory vector store (RAG)
                                                              ▲
                                    POST /finbridge/kb/ingest ┘  (scripts/seed_kb.py loads kb/*.md)
```

Design rule: **the LLM never does the arithmetic.** The finance engine computes balances, risk flags and scenarios; the agent explains them in plain English and cites assumptions. This is the "ethical, transparent" angle from the brief.

## Setup (≈10 min)
1. n8n → Import from file: `finbridge-finance-engine.json`, `finbridge-kb-ingest.json`, `finbridge-chat-agent.json`.
2. Credentials: attach an **Anthropic** credential to *Anthropic Chat Model*, and an **OpenAI** credential to both *Embeddings* nodes (Anthropic has no embeddings; swap for Google/Cohere/Ollama if you prefer, but use the same one on ingest and query).
3. Chat workflow → node *get_financial_forecast* → set the URL to your n8n base URL if not `localhost:5678`.
4. Activate all three workflows.
5. Seed the knowledge base: `python3 scripts/seed_kb.py https://YOUR-N8N` .
6. Test: `curl -X POST $N8N/webhook/finbridge/chat -H 'Content-Type: application/json' -d '{"message":"Will I run short before payday?","userId":"demo-amira","sessionId":"t1"}'`

Rebuild after editing `code/*.js` or `prompts/*.md`: `python3 build_workflows.py`, then re-import.

## API contract (for the web team)
**POST `/webhook/finbridge/chat`**  
Request: `{ "message": string, "userId": string, "sessionId"?: string, "channel"?: "web"|"voice" }`  
Response: `{ "reply": string, "sessionId": string, "userId": string }`

**POST `/webhook/finbridge/forecast`** (use this to drive dashboard charts directly, no LLM involved)  
Request: `{ "userId": string, "horizonDays"?: 14-180 }`  
Response: `{ riskLevel, currentBalance, snapshot{monthlyIncome, monthlyOutgoings, monthlySurplus, bufferDays, safeToSpendPerDayUntilNextIncome, spendByCategoryMonthly, ...}, scenarios{base, income_dip, unexpected_cost, perfect_storm → weekly[{day,balance}], firstOverdraftDay, lowestBalance}, flags[], nudges[], assumptions[] }`  
Demo users: `demo-amira` (zero-hours single parent, medium risk), `demo-josh` (student with termly loan), `demo-priya` (stable salary saver, low risk).

**POST `/webhook/finbridge/kb/ingest`** `{ "title", "text", "source"? }` → adds a document to the RAG store.

## ElevenLabs voice
Simplest reliable route: in the ElevenLabs Agent, add a **server tool** `ask_finbridge` (POST → `/webhook/finbridge/chat`, body params `message` = what the caller said, `userId` and `sessionId` from the call's dynamic variables, `channel` = `"voice"` constant). Read `reply` back to the caller. In the agent's system prompt tell it: "For any money question call ask_finbridge and read the reply aloud verbatim." `channel: "voice"` makes the n8n agent answer in 2-4 spoken-style sentences.
(Alternative: ElevenLabs *Custom LLM* needs an OpenAI-compatible streaming endpoint, which is more work; only do it if the double-LLM latency is a problem.)

## Known limits / next steps
- **Tested:** all 3 workflows import into n8n 2.35; the forecast endpoint runs end-to-end; the chat/ingest workflows start and execute until they reach the embeddings step. **Not tested:** live LLM + RAG calls (needs your API keys).
- Data is **generated demo personas** in the `Load User Data` node. Swap that node for an HTTP/DB call (same output shape is documented in the file) to use a mock bank/Open Banking API or user-uploaded CSV.
- The in-memory vector store is wiped on n8n restart: re-run `seed_kb.py`, or switch the two vector store nodes to Supabase/Pinecone/Qdrant for persistence.
- Webhooks are open (`allowedOrigins: *`, no auth). Before a public demo add a header-auth check and restrict origin.
- KB content is general UK guidance written for the hackathon: have it reviewed before presenting as advice, and keep rates/limits out of it (they go stale).
