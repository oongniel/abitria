# Project Structure Reference

## Folder Layout

```
project-root/
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Root layout — fonts, globals
│   ├── globals.css                       # Design tokens, type classes, container utils
│   ├── page.tsx                          # Home route
│   └── [slug]/
│       └── page.tsx                      # Dynamic page route (imports content JSON)
│
├── components/
│   ├── blocks/                           # Page blocks — flat, one file per block
│   │   ├── HeroBlock.tsx
│   │   ├── FeaturedProjectsBlock.tsx
│   │   └── ...
│   ├── elements/                         # Shared non-primitive components
│   │   ├── cards/
│   │   │   ├── NewsCard.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── SearchCard.tsx
│   │   ├── form-fields/
│   │   │   └── ...
│   │   ├── TagPill.tsx
│   │   └── ImagePlaceholder.tsx
│   └── ui/                               # Base primitives — button, link, image, etc.
│       ├── button.tsx                    # variants: primary | secondary | white | outline | glass
│       ├── link.tsx
│       ├── image.tsx
│       ├── blur-image.tsx
│       └── select.tsx
│
├── content/                              # Mock JSON — one file per page (design team edits these)
│   ├── home.json
│   ├── about.json
│   └── [page].json
│
├── lib/
│   └── animation.ts                      # EASE / DURATION constants for GSAP + Framer Motion
│
├── typings/
│   ├── blocks.ts                         # All block interfaces — append only
│   ├── common.ts                         # DynamicZoneProps, shared types
│   └── strapi.ts                         # StrapiMedia, StrapiRichText, RouteProps
│
├── utils/
│   └── FullBlockRendererPages.tsx        # Central block renderer
│
├── __tests__/
│   └── blocks/                           # Unit tests — one per block
│       └── HeroBlock.test.tsx
│
├── e2e/                                  # Playwright E2E — one spec per page
│   └── home.spec.ts
│
├── public/
│   └── uploads/                          # Local placeholder images for mock data
│
├── DEVELOPMENT_GUIDE.md
├── vitest.config.ts
├── vitest.setup.ts
├── playwright.config.ts
└── tailwind.config.ts
```

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Block component file | PascalCase + `Block` suffix | `HeroBlock.tsx` |
| Block component name | Same as file | `HeroBlock` |
| Block Strapi string | `blocks.` + kebab of name without `Block` | `blocks.hero` |
| Type interface | `BlockNameProps` | `HeroBlockProps` |
| Page mock file | kebab page name | `content/home.json` |

## Base Files to Generate on Bootstrap

### `typings/common.ts`
```ts
export interface DynamicZoneProps {
  __component: string;
  id: number | string;
  [key: string]: unknown;
}
```

### `typings/strapi.ts`
```ts
export interface RouteProps {
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
}
```

### `typings/blocks.ts`
```ts
// Extend this file with every new block's props.
// Never remove existing types.
import type { DynamicZoneProps } from "./common";

export interface PageBlock {
  page: string;
}

export interface TestBlockProps extends DynamicZoneProps {
  __component: "blocks.test-block";
  title: string;
  description: string;
}

// Add new block types below this line
```

### `app/[slug]/page.tsx` — direct import pattern

```tsx
import homeData from "@/content/home.json";
import FullBlockRendererPages from "@/utils/FullBlockRendererPages";
import type { DynamicZoneProps } from "@/typings/common";

export default function HomePage() {
  return (
    <FullBlockRendererPages
      blocks={homeData.blocks as DynamicZoneProps[]}
      page="home"
    />
  );
}
```

**Design team responsibility:** edit `content/home.json` to add/update dummy content.
**Dev team handoff:** replace the import with a real Strapi API call — the blocks and types need zero changes.

### `tailwind.config.ts`
Standard TailwindCSS v3 config. Include `content` glob for `app/`, `components/`, and `utils/`.
