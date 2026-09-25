# DEVELOPMENT_GUIDE.md — Template & Update Rules

Every time a block is created or modified, `DEVELOPMENT_GUIDE.md` at the project root must be updated. This file is the source of truth for the design and dev team.

---

## Initial File (generate on project bootstrap)

````md
# Development Guide

This document is auto-maintained. Update it every time a block is added, modified, or removed.

---

## Stack

| | |
|---|---|
| Framework | Next.js (App Router) |
| Styling | TailwindCSS |
| CMS | Strapi v5 |
| Language | TypeScript (strict) |
| Error Handling | react-error-boundary |

---

## Project Structure

```
components/blocks/     → All page block components (flat, one file per block)
typings/blocks.ts      → All block TypeScript interfaces
typings/common.ts      → Shared types (DynamicZoneProps)
typings/strapi.ts      → Strapi response types (StrapiMedia, RouteProps, etc.)
utils/FullBlockRendererPages.tsx  → Dynamic block renderer
content/               → Strapi v5 mock JSON (one file per page)
DEVELOPMENT_GUIDE.md   → This file
```

---

## Blocks Index

| Block Name | Component | Strapi Component String | Page(s) Used |
|---|---|---|---|
| Test Block | `TestBlock.tsx` | `blocks.test-block` | home |

---

## Block Details

### TestBlock

**File:** `components/blocks/TestBlock.tsx`
**Strapi string:** `blocks.test-block`
**Type:** `TestBlockProps` in `typings/blocks.ts`

**Props:**

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Main heading |
| `description` | `string` | Body text |

**Mock data (`content/home.json`):**
```json
{
  "__component": "blocks.test-block",
  "id": 1,
  "title": "Test Block Title",
  "description": "Placeholder description from Strapi."
}
```

---

## Adding a New Block

1. Create `components/blocks/NewBlockName.tsx`
2. Add `NewBlockNameProps` to `typings/blocks.ts`
3. Add import + `case` to `utils/FullBlockRendererPages.tsx`
4. Add mock entry to `content/[page].json`
5. Add row to **Blocks Index** table above
6. Add **Block Details** section below the last block

> Never hardcode text or images. All content must come from Strapi props.
````

---

## How to Update (rules for Claude)

### Adding a block — two things to update:

**1. Append a row to the Blocks Index table:**
```
| Hero Block | `HeroBlock.tsx` | `blocks.hero` | home |
```

**2. Append a Block Details section after the last existing one:**
````md
### HeroBlock

**File:** `components/blocks/HeroBlock.tsx`
**Strapi string:** `blocks.hero`
**Type:** `HeroBlockProps` in `typings/blocks.ts`

**Props:**

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Main heading |
| `subtitle` | `string` | Supporting text |

**Mock data (`content/home.json`):**
```json
{
  "__component": "blocks.hero",
  "id": 2,
  "title": "Welcome to the platform",
  "subtitle": "Built for scale and speed"
}
```
````

### Modifying a block — update the Props table and mock data in that block's section. Do not touch other sections.

### Removing a block — remove the table row and the full block section. Note the removal with a comment at the bottom:
```
<!-- BlockName removed YYYY-MM-DD -->
```
