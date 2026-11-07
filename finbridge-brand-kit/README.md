# finbridge. brand kit

Everything here matches the launch film exactly.

## Logo — `logo/`

| File | Use |
|---|---|
| `finbridge-logo-white.png` | Off-white wordmark, transparent background. For dark slides and backgrounds. 2806×797 px. |
| `finbridge-logo-white@1200.png` | Same, 1200 px wide, for web and documents. |
| `finbridge-logo-midnight-ink.png` | Deep-violet wordmark, transparent background. For light backgrounds. 2806×797 px. |
| `finbridge-logo-midnight-ink@1200.png` | Same, 1200 px wide. |
| `finbridge-logo-on-midnight.png` | The film's end card look: glowing wordmark on midnight. 3200×1000 px. Good for a title slide or banner. |

**Rules:** always lowercase, always with the full stop, never stretched or recoloured outside the palette. Leave clear space around it of at least the height of the "n".

## Font — `fonts/`

**Plus Jakarta Sans** (by Tokotype). It's free and open source under the SIL Open Font License (`OFL-LICENSE.txt`), so you can use it anywhere, including commercially.

- `ttf/`: install these on your computer for PowerPoint, Keynote, Word, Figma or Canva. Double-click each file and choose Install.
- `web/`: .woff2 files for websites.
- These files cover English (Latin) characters. For other alphabets or italics, download the full family free from Google Fonts by searching for "Plus Jakarta Sans".

| Weight | Where it's used |
|---|---|
| ExtraBold 800 | Wordmark, key headlines |
| Bold 700 | Headlines |
| SemiBold 600 | Labels, card text, tagline |
| Medium 500 | Body text |
| Regular 400 | Long-form text |

**Wordmark settings:** ExtraBold 800, letter-spacing −4.5% (about −45 in PowerPoint and Figma tracking), ligatures off so "fi" stays two letters.

## Colours — `finbridge-palette.png`, `tokens/`

| Name | Hex | Role |
|---|---|---|
| Black | `#04030A` | Deepest background |
| Midnight | `#090821` | Main background |
| Deep Violet | `#130C33` | Raised surfaces; dark ink on light backgrounds |
| Violet | `#7C3AED` | Primary brand colour, glows |
| Electric Violet | `#8B5CF6` | Accents, lines, highlights |
| Blue | `#3D5AFE` | Secondary brand colour |
| Soft Blue | `#5B7CFF` | Gradient end, secondary accents |
| Lavender | `#C4B5FD` | Highlights, borders, rim light |
| Bright Lavender | `#E6DDFF` | Luminous highlights, body text on dark |
| Off White | `#F6F3FF` | Headlines and wordmark on dark |
| Muted | `#A9A3D1` | Secondary text |

**Accent gradient** (highlighted words): Bright Lavender → Lavender → Electric Violet → Soft Blue, at about 100°.
**Icon tiles:** Electric Violet → Blue at 135°.

`tokens/finbridge-tokens.css` and `tokens/finbridge-tokens.json` contain all of this, plus card styles, radii, glows and motion easing, ready for a website or app.
