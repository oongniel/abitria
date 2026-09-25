# Design System Rules

Rules enforced by the frontend lead. Apply every time a block is created or modified.

---

## Typography

- Use type classes only: `display`, `h1`, `h1-lora`, `h2`, `h2-lora`, `t1`, `t2`, `t3`, `t4`, `t5`, `body1`/`p1`, `body2`/`p2`, `b1`/`text-btn`, `b2`
- Each class already includes its own `md:` step — never add `text-[32px]`, `text-4xl`, or any `md:text-*` override on top
- Always `rem`, never `px` for type. Root is fluid ~10px at 1440px. `1.6rem = 16px` at design scale
- Headings always get `text-balance`
- No fixed text widths, no truncation unless Figma explicitly shows it

---

## Sizing & Spacing

- **No fixed heights on content containers.** Use `aspect-[w/h]` taken from the Figma frame (e.g. `aspect-[650/475]` desktop, `aspect-[335/240]` mobile)
- Fixed height is only for chrome: buttons, inputs, pills (e.g. `h-[54px]`)
- **Full-screen sections**: use `dvh` or `svh` — never a pixel height copied from Figma
- **Horizontal padding**: always `.container-pad` / `.container-x` (20px mobile, 60px desktop, 80px wide via `-80`). Outer page inset is `.page-shell`. Never hand-roll `px-[60px]`
- **Vertical rhythm**: `--section-gap` applied by `BlockSection` (60px mobile / 80px desktop). Never add your own section margins
- **Sibling spacing**: `flex`/`grid` + `gap` only. Not margins, not absolute positioning

---

## Colour & Motion

- Colours from tokens only: `--amaranth`, `--blue-gem`, `--paua`, `--violet-blue`, `--wewak`, `--salomie`, `--bermuda`, `--cadet-blue`, `--grey`
- Transparency: use `--b5…--b100` (black) / `--w5…--w100` (white) ladders. Never `rgba()` or raw hex
- Gradients: `--gradient-primary`, `--gradient-primary-hover`, `--gradient-primary-pressed` only
- Motion tokens: `--ease-spring`, `--duration-cta`, and `EASE`/`DURATION` from `lib/animation.ts`
- Never author a new `cubic-bezier`
- **Every animation needs a `prefers-reduced-motion` branch** — show the end state, no movement

---

## Reusable UI Components

Always check these exist before building anything new:

| Need | Use |
|---|---|
| Button | `ui/button.tsx` — variants: `primary \| secondary \| white \| outline \| glass` |
| Link | `ui/link.tsx` |
| Image | `ui/image.tsx` or `ui/blur-image.tsx` |
| Select | `ui/select.tsx` |
| News card | `elements/cards/NewsCard.tsx` |
| Project card | `elements/cards/ProjectCard.tsx` |
| Search card | `elements/cards/SearchCard.tsx` |
| Tag / pill | `elements/TagPill.tsx` |
| Image placeholder | `elements/ImagePlaceholder.tsx` |
| Form fields | `elements/form-fields/*` |

Rules:
- Use a button variant — never restyle a button inline, never write a new button component
- A new visual style = a new `cva` variant on the existing component, not a new component
- New shared components go in `ui/` or `elements/` — never defined inside a block file
- Multiple looks of the same thing: one component with `cva` variants (`variant`/`size`) + `defaultVariants`. Not booleans, not separate components
- If a design introduces a genuinely new variant (e.g. 6th button style), flag it explicitly — it's an addition to the existing component

---

## Content Rules

- All copy, images, numbers, colours, and links arrive as props — nothing hardcoded in the component
- Never use `background-image` for content — always `<Image>` tags
- Multi-line CMS labels arrive as **one field with `\n`** — split in the component. Never expect `Line1`/`Line2` props
- Item counts vary — layouts must work at 3 items and at 8. Never hardcode item assumptions

---

## Layout & Internationalisation

- **Bilingual-first**: always logical CSS properties — `ps`/`pe`, `ms`/`me`, `start-0`/`end-0`
- Never use `left`/`right` in layout — the layout must mirror correctly in Arabic

---

## Libraries

| Need | Use |
|---|---|
| Scroll-driven / sequenced animation | GSAP + ScrollTrigger + `@gsap/react` |
| Enter / exit / layout transitions | Framer Motion |
| Sliders / carousels | Embla Carousel |
| Simple hover, fade, colour | Plain CSS |

- One library per component — never drive the same element with both GSAP and Framer Motion
- Never introduce a new animation, carousel, or UI library
- If something genuinely can't be built with the above, flag it rather than adding a dependency
