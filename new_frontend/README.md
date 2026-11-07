# Finbridge Money Compass

## Chat and voice

The chat panel is the app's front door, and it takes typed or spoken questions. Both land in
the same transcript and the same n8n session, so a conversation can switch between keyboard
and microphone mid-thread.

```text
          ┌─ type ────────────────────────────────┐
                                                  ▼
  ┌─ mic ─> POST /api/voice/stt ─> ElevenLabs ─> POST /api/chat ─> n8n /webhook/finbridge/chat
  │         (Scribe transcript)                      │                   [Claude agent+memory]
  │                                                  ▼
  └──────── audio plays <─ POST /api/voice/tts <─ reply + supportSources
                              (ElevenLabs)
```

### Setup

1. `cp .env.example .env.local` and fill in `N8N_BASE_URL` and `ELEVENLABS_API_KEY`.
2. `npm i && npm run dev` (or `bun install && bun dev` — the lockfile is `bun.lock`).

Both keys are read only inside `src/routes/api/*` and are never bundled into browser
JavaScript. Do not prefix either with `VITE_`, which would publish it to the client.

**Node 20.19 or newer is required.** The Vite 8 / rolldown toolchain calls
`util.styleText` with an array of formats, which older Node rejects at startup — `npm run
build` and `npm test` both fail on Node 20.12 with `ERR_INVALID_ARG_VALUE`.

### The three server routes

| Route | Does |
| --- | --- |
| `POST /api/chat` | Validates the question and proxies it to the n8n chat webhook. Keeps the n8n URL and any webhook secret server-side, and normalises whatever shape n8n answers with. |
| `POST /api/voice/stt` | Takes a recorded clip as `multipart/form-data` (`audio`) and returns `{ text }` from ElevenLabs Scribe. |
| `POST /api/voice/tts` | Takes `{ text, voice? }` and streams back `audio/mpeg` from ElevenLabs. `voice` is a name from an allowlist, not a raw voice id, so the browser cannot bill arbitrary voices. |

### Voice behaviour

- **Push to talk.** Click the mic to start, click again to stop — or just stop talking: the
  recorder watches the mic level and ends the turn after ~1.6s of silence. A ring around the
  button tracks that level, because silence that looks like success is the usual way voice
  input fails. Hard cap 30s.
- **`channel`.** A spoken question is sent with `channel: "voice"`, which is what makes the
  n8n agent answer in 2–4 spoken-style sentences instead of at reading length.
- **Spoken replies.** Off by default. Turning it on reads each reply aloud; the answer to a
  spoken question is always read back, since someone who just talked to the page is not
  watching it. Every reply also has its own *Read aloud* button.
- **Hands-free** reopens the mic once a reply finishes playing, giving a continuous
  conversation. Starting to speak cuts off whatever is playing.
- **Degradation.** A browser with no `MediaRecorder` hides the mic and keeps typing fully
  available; a blocked microphone, a failed transcription and a failed voice all show a
  dismissible banner and leave the reply on screen as text.

### What the model is not allowed to do

The rules in the [root README](../README.md) hold here too, and the UI enforces its share:

- Source cards are built from the `supportSources` catalogue payload, never parsed out of
  model prose, and an entry without a real `http(s)` URL and title is dropped. Each card
  shows the provider's own caution.
- Questions are length-bounded (1,200 chars) and `userId`/`sessionId` must be plain slugs
  before anything is forwarded.
- Any drafted message is rendered as an editable textarea for the user to send themselves.

### Where to look

| Path | What it is |
| --- | --- |
| `src/components/finbridge/Chat.tsx` | The panel: transcript, composer, mic, voice toggles. |
| `src/hooks/useFinBridgeChat.ts` | Transcript and session state; one `send()` for both input paths. |
| `src/hooks/useVoiceRecorder.ts` | Mic capture, level metering, silence auto-stop, teardown. |
| `src/hooks/useSpeech.ts` | Reply playback, one utterance at a time. |
| `src/lib/finbridge/normalize.ts` | Request validation and n8n response normalisation (unit-tested). |
| `src/lib/finbridge/server-config.ts` | Server-only env reading. Never import from a component. |

Tests: `npm test`. The forecast endpoint (`/webhook/finbridge/forecast`) is not wired up yet —
the header cards and the dashboard charts it would drive are still placeholders.

DESIGN

- Match NatWest's brand feel: confident purple on clean white and soft lavender. Use these tokens:

  primary purple #5A287D (buttons, active nav, wordmark), deep purple #42145F (headings and dark surfaces),

  page background #F5F1F9, card surface #FFFFFF, text #1F1030, muted text #6A5A7A, borders #DDD0E8,

  urgent/Lifeline red #C8102E.

- Dark mode: background #1A0B27, surface #2A1440, text #F1E9F8, accent lightened to #B88EE3.

- Define these as CSS variables / Tailwind theme tokens so the palette can be swapped in one place.

- Georgia-style serif headings, system sans body. High contrast (WCAG AA), visible keyboard focus, large tap targets, plain language (reading age ~12), no jargon.

- Don't use NatWest logos or trademarked assets. Only the colour feel.Build the front-end skeleton for "FinBridge", a financial coaching web app. Use the attached file/screenshot as the exact layout reference. Build UI only: no backend, no auth, no database, no API calls. Use placeholder content throughout. Other features will be added later.

LAYOUT (desktop)
- Top-left: "FinBridge" wordmark.
- Top-right: three cards in a row ("Next step", "Coming up", "Support for you"), each with a dashed placeholder area.
- Left: a rounded sidebar with four buttons: Career help, Future hardship, Money you have access to, Lifeline (Lifeline in red).
- Right, top: a topic panel. By default it shows a short welcome message. Clicking a sidebar button shows that topic's title, a one-line description and four dashed placeholder boxes. The active sidebar button is highlighted.
- Right, bottom: a chat area with a "Chat bot" heading, a scrolling message list, a wide text input and a Send button. Sending a message adds it to the list, followed by a hardcoded placeholder reply. Add a clear "TODO: connect chatbot" comment where the real call will go.
- Footer note in the sidebar: "Prototype. Guidance only, not regulated financial advice."
- Mobile: stack everything in one column, with the sidebar buttons wrapping.

DESIGN
- NatWest-style palette: primary purple #5A287D (buttons, active nav, wordmark), page background #F5F1F9, card surface #FFFFFF, text #1F1030, muted text #6A5A7A, borders #DDD0E8, Lifeline red #C8102E.
- Dark mode: background #1A0B27, surface #2A1440, text #F1E9F8, accent #B88EE3.
- Define colours as theme tokens so they can be changed in one place.
- Georgia-style serif headings, system sans body, rounded corners, WCAG AA contrast, visible keyboard focus, plain language.
- Don't use any NatWest logos or trademarked assets.

STRUCTURE
- Keep the code modular so features can be added later: separate components for Header cards, Sidebar, TopicPanel and Chat, with topic content in a single data file.
- Keep topic state in the page component; no routing needed yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bb851471-5ce7-426d-b8c1-77c4e3bbd277).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
