---
name: base-website-scaffold
description: >
  Use this skill whenever the user asks to scaffold a new website, start a new Next.js project,
  create a new block, add a new page section, or set up the base structure for a TenTwenty client
  build. Triggers on: "new project", "scaffold", "new block", "add a block", "create a section",
  "start a site", "base setup", or any request to generate Next.js + Tailwind + Strapi-connected
  component structure. Always use this skill for any new block creation — even mid-project.
sources: [chat]
---

# Base Website Scaffold Skill

Generates consistent, production-ready Next.js + TailwindCSS project scaffolding following TenTwenty's conventions. Covers full project setup AND individual block creation mid-project.

## Two Modes

1. **Full project bootstrap** — user wants to start a new site from scratch
2. **New block only** — user wants to add a block to an existing project

Detect from context. If ambiguous, ask.

---

## Stack

- **Framework**: Next.js (App Router)
- **Styling**: TailwindCSS
- **Content**: Mock JSON in `content/[page].json` — Strapi v5-compatible schema so dev team can swap to live API later with zero block changes. Design team never integrates Strapi.
- **Error boundary**: `react-error-boundary`
- **Types**: TypeScript strict mode
- **E2E testing**: Playwright (`e2e/`)
- **Unit / component testing**: Vitest + React Testing Library (`__tests__/blocks/`)

Read `references/project-structure.md` for the full folder layout and file conventions.
Read `references/block-creation.md` for the step-by-step block scaffolding process.
Read `references/strapi-types.md` for Strapi v5 type conventions and mock data shape.
Read `references/testing.md` for Playwright and Vitest setup, templates, and conventions.
Read `references/design-system-rules.md` for typography, spacing, colour, component reuse, layout, and library rules — apply on every block.

---

## Core Rules (always enforce)

1. **No hardcoded text or images** — ever. All content comes from Strapi props.
2. **Block component**: `components/blocks/BlockName.tsx` (flat, PascalCase, suffix `Block`)
3. **Types**: all block types live in `typings/blocks.ts` — add, never replace
4. **Strapi component string**: `blocks.block-name` (kebab, auto-derived from PascalCase filename: `HeroBlock` → `blocks.hero-block`)
5. **Mock data**: `content/[page].json` — Strapi v5 flat response shape (no `data.attributes` wrapper)
6. **FullBlockRendererPages**: every new block gets a `case` added — read `references/block-creation.md` for the exact pattern
7. **DEVELOPMENT_GUIDE.md**: updated every time a block is created — read `references/dev-guide-template.md` for the schema
8. **Tests**: every block gets a `__tests__/blocks/BlockName.test.tsx` — mock data sourced from `content/[page].json`, never hardcoded inline

---

## On First Run (full project)

Generate in this order:
1. Project structure (folders + base files)
2. Base typings (`typings/blocks.ts`, `typings/common.ts`, `typings/strapi.ts`)
3. `FullBlockRendererPages` component with the `global-area` nested renderer already included
4. A `TestBlock` as the first working example end-to-end
5. `content/home.json` with TestBlock mock data
6. `DEVELOPMENT_GUIDE.md` pre-filled with TestBlock entry

Then tell the user what to run:
```bash
npm install react-error-boundary
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-tsconfig-paths
npx playwright install
```

---

## When Adding a Block Mid-Project

1. Scaffold the block file
2. Add typings to `typings/blocks.ts`
3. Add the `case` to `FullBlockRendererPages`
4. Add mock entry to the relevant `content/[page].json`
5. Create `__tests__/blocks/BlockName.test.tsx` (read `references/testing.md`)
6. Update E2E spec if block appears on a tested page
7. Update `DEVELOPMENT_GUIDE.md`

Never skip steps 5 or 7.
