# Content Schema Reference (Strapi v5-compatible)

The design team never integrates Strapi. This file defines the **JSON shape** to use in `content/[page].json` mock files so that when the dev team connects a live Strapi v5 API, the response maps directly to existing block props — no refactoring needed.

Strapi v5 uses a flat response shape — no `data.attributes` wrapper (that was v4).

---

## Page Response Shape

```json
{
  "id": 1,
  "documentId": "abc123",
  "slug": "home",
  "blocks": [
    {
      "__component": "blocks.hero",
      "id": 1,
      "title": "Welcome",
      "subtitle": "Subtitle text here"
    },
    {
      "__component": "blocks.global-area",
      "id": 2,
      "Stacks": {
        "Blocks": [
          {
            "__component": "blocks.test-block",
            "id": 3,
            "title": "Nested block",
            "description": "This is inside a global area"
          }
        ]
      }
    }
  ]
}
```

---

## Media Field Shape (Strapi v5)

When a block has an image, use this type:

```ts
// typings/strapi.ts
export interface StrapiMedia {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  mime: string;
  name: string;
}
```

Mock JSON for a media field:

```json
"image": {
  "id": 1,
  "documentId": "img001",
  "url": "/uploads/placeholder.jpg",
  "alternativeText": "Descriptive alt text",
  "width": 1440,
  "height": 900,
  "mime": "image/jpeg",
  "name": "placeholder.jpg"
}
```

In components, always render images via Next.js `<Image>`:

```tsx
import Image from "next/image";

<Image
  src={block.image.url}
  alt={block.image.alternativeText ?? ""}
  width={block.image.width}
  height={block.image.height}
/>
```

---

## Rich Text Field Shape (Strapi v5)

Strapi v5 returns rich text as a blocks array (not HTML string):

```ts
export interface StrapiRichTextBlock {
  type: string;
  children: { type: string; text: string }[];
}

export type StrapiRichText = StrapiRichTextBlock[];
```

Use `@strapi/blocks-react-renderer` or a custom renderer — never dangerouslySetInnerHTML.

---

## Relation Field Shape

Single relation (e.g. a linked page):

```json
"link": {
  "id": 5,
  "documentId": "page001",
  "slug": "about",
  "title": "About Us"
}
```

---

## Full content/home.json Example

```json
{
  "id": 1,
  "documentId": "home001",
  "slug": "home",
  "blocks": [
    {
      "__component": "blocks.test-block",
      "id": 1,
      "title": "Test Block Title",
      "description": "This is placeholder description text from Strapi mock data."
    }
  ]
}
```
