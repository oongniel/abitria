# Sillage — design system

## World
A perfumer's ledger: porcelain paper, oud-dark ink, amber for money earned. Quiet, precise, a little luxurious. The one memorable element is the **batch flacon** — a bottle whose liquid is the stock left, with a break-even line etched on the glass. When the level drops past the line the liquid turns amber: the batch is in profit.

## Colour (tokens in `app/globals.css`, RGB channels)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | #F4F3F7 | #121015 | page |
| `--surface` | #FFFFFF | #1B1820 | panels |
| `--surface-2` | #ECEAF1 | #24202B | sidebar, inset |
| `--ink` | #1D1724 | #F1EDF5 | text |
| `--ink-2` | #5A5266 | #A79FB2 | secondary text |
| `--line` | #DDD9E4 | #2E2936 | hairlines |
| `--oud` | #5E2A52 | #D9A2CB | primary action, selection |
| `--amber` | #93570F | #E5A85A | profit, earned money |
| `--sage` | #1E6B5C | #6CC7B0 | success |
| `--rose` | #B4232C | #F08A8F | loss, destructive |

## Type
- UI: Instrument Sans Variable (tabular numerals in all figures)
- Titles and headline figures: Fraunces Variable (opsz, soft)
- Scale 1.2, fixed rem. Classes: `h1 h2 t1 t2 t3 body1 body2 b1 b2`

## Motion (`lib/animation.ts`)
- EASE.out `[0.16, 1, 0.3, 1]`; feedback 120ms, state 220ms, layout 380ms, focal 900ms
- Focal: flacon pour on first view, level glides on each sale
- Feedback: button press scale, stepper nudge, ticking figures, toasts with undo
- Theme switch: circular view-transition reveal from the toggle
- `prefers-reduced-motion`: no wave, no pour, no reveal; state changes still fade
