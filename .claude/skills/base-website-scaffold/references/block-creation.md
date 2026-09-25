# Block Creation Reference

Follow these steps in order every time a new block is created.

---

## Step 1 — Block Component (`components/blocks/BlockName.tsx`)

```tsx
// components/blocks/HeroBlock.tsx
import type { HeroBlockProps } from "@/typings/blocks";

interface Props {
  block: HeroBlockProps;
}

const HeroBlock = ({ block }: Props) => {
  return (
    <section>
      <h1>{block.title}</h1>
      <p>{block.subtitle}</p>
    </section>
  );
};

export default HeroBlock;
```

Rules:
- Props come exclusively from `block` — no hardcoded strings, no hardcoded image URLs
- Use Tailwind for all styling
- No `useState`/`useEffect` unless strictly necessary — blocks are display components
- Image fields: always use Next.js `<Image>` with `src={block.image.url}` (Strapi v5 media shape — see `strapi-types.md`)

---

## Step 2 — Typings (`typings/blocks.ts`)

Append the new interface. Never modify existing interfaces.

```ts
export interface HeroBlockProps extends DynamicZoneProps {
  __component: "blocks.hero";
  title: string;
  subtitle: string;
  // image?: StrapiMedia;  // if block has an image — see strapi-types.md
}
```

Derive `__component` string automatically:
- Remove `Block` suffix from filename: `HeroBlock` → `Hero`
- Kebab-case: `Hero` → `hero`
- Prepend `blocks.`: `blocks.hero`
- Multi-word: `FeaturedProjectsBlock` → `blocks.featured-projects`

---

## Step 3 — FullBlockRendererPages (`utils/FullBlockRendererPages.tsx`)

Add the import and the `case` together. Keep cases alphabetically ordered.

```tsx
// Add import at top with other block imports
import HeroBlock from "@/components/blocks/HeroBlock";
import type { HeroBlockProps } from "@/typings/blocks";

// Add case inside getComponent switch
case "blocks.hero":
  return <HeroBlock block={block as unknown as HeroBlockProps} />;
```

Full file shape for reference — do not change the `global-area` case or ErrorBoundary wrapper:

```tsx
import { ErrorBoundary } from "react-error-boundary";

import HeroBlock from "@/components/blocks/HeroBlock";
import TestBlock from "@/components/blocks/TestBlock";
import type { HeroBlockProps, PageBlock, TestBlockProps } from "@/typings/blocks";
import type { DynamicZoneProps } from "@/typings/common";
import type { RouteProps } from "@/typings/strapi";

interface FullBlockRendererPagesProps {
  blocks?: DynamicZoneProps[];
  page: PageBlock["page"];
  routes?: RouteProps;
}

const FullBlockRendererPages = ({
  blocks,
  page,
}: FullBlockRendererPagesProps) => {
  if (!blocks?.length) return null;

  const getComponent = (block: DynamicZoneProps) => {
    switch (block.__component) {
      case "blocks.hero":
        return <HeroBlock block={block as unknown as HeroBlockProps} />;
      case "blocks.test-block":
        return <TestBlock block={block as unknown as TestBlockProps} />;
      case "blocks.global-area": {
        const nested = block.Stacks as
          | undefined
          | { Blocks?: DynamicZoneProps[] };
        return <FullBlockRendererPages blocks={nested?.Blocks} page={page} />;
      }
      default:
        return null;
    }
  };

  return (
    <>
      {blocks.map((block, index) => (
        <ErrorBoundary
          key={`${block.__component}-${String(block.id)}-${index}`}
          fallback={null}
        >
          {getComponent(block)}
        </ErrorBoundary>
      ))}
    </>
  );
};

export default FullBlockRendererPages;
```

---

## Step 4 — Mock Data (`content/[page].json`)

Append the block entry to the relevant page's `blocks` array. Use Strapi v5 flat shape (no `data.attributes` wrapper).

```json
{
  "__component": "blocks.hero",
  "id": 2,
  "title": "Welcome to the platform",
  "subtitle": "Built for scale and speed"
}
```

See `strapi-types.md` for media field shape.

---

## Step 5 — DEVELOPMENT_GUIDE.md

Append a new row to the blocks table and a new section with full block detail.

See `dev-guide-template.md` for exact format.

---

## Checklist

- [ ] `components/blocks/BlockNameBlock.tsx` created
- [ ] Type added to `typings/blocks.ts`
- [ ] Import + case added to `FullBlockRendererPages.tsx`
- [ ] Mock entry added to `content/[page].json`
- [ ] `DEVELOPMENT_GUIDE.md` updated
