# Finbridge Money Compass

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
