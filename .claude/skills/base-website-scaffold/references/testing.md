# Testing Reference

## Stack

| Layer | Tool |
|---|---|
| E2E | Playwright |
| Unit / Component | Vitest + React Testing Library |

---

## Setup

### Install

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx playwright install
```

### `vitest.config.ts`

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

### `vitest.setup.ts`

```ts
import "@testing-library/jest-dom";
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### `package.json` scripts

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## Folder Structure

```
project-root/
├── components/blocks/
│   └── HeroBlock.tsx
├── __tests__/
│   └── blocks/
│       └── HeroBlock.test.tsx     ← unit tests live here
├── e2e/
│   └── home.spec.ts               ← e2e tests live here
├── vitest.config.ts
├── vitest.setup.ts
└── playwright.config.ts
```

---

## Unit Testing — Blocks

Every block gets a test file at `__tests__/blocks/BlockName.test.tsx`.

**Rules:**
- Pass mock data from `content/[page].json` as the `block` prop — never inline hardcoded strings in tests
- Test that key content renders
- Test conditional rendering (optional fields, empty states)
- Do NOT test styling or class names

### Template: `__tests__/blocks/HeroBlock.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HeroBlock from "@/components/blocks/HeroBlock";
import mockData from "@/content/home.json";

const block = mockData.blocks.find(
  (b) => b.__component === "blocks.hero"
) as Parameters<typeof HeroBlock>[0]["block"];

describe("HeroBlock", () => {
  it("renders title", () => {
    render(<HeroBlock block={block} />);
    expect(screen.getByText(block.title)).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<HeroBlock block={block} />);
    expect(screen.getByText(block.subtitle)).toBeInTheDocument();
  });

  it("renders image with correct alt text", () => {
    render(<HeroBlock block={block} />);
    expect(
      screen.getByRole("img", { name: block.image.alternativeText ?? "" })
    ).toBeInTheDocument();
  });
});
```

---

## E2E Testing — Pages

E2E tests live in `e2e/[page].spec.ts`. They test page-level rendering and critical user flows.

**Rules:**
- Target semantic roles and visible text — never test class names or implementation details
- One spec file per page
- Use `data-testid` sparingly and only for interactive elements with no accessible role

### Template: `e2e/home.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero block", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("page has no accessibility violations", async ({ page }) => {
    // Optional: add @axe-core/playwright for a11y checks
    await expect(page).toHaveURL("/");
  });
});
```

---

## When Adding a New Block — Testing Checklist

- [ ] `__tests__/blocks/BlockName.test.tsx` created
- [ ] Mock data sourced from `content/[page].json` (no inline strings)
- [ ] All required props tested for render
- [ ] Optional/nullable fields tested for graceful empty state
- [ ] E2E spec updated if the block appears on a tested page
- [ ] Entry added to `DEVELOPMENT_GUIDE.md` block section under **Tests**

---

## DEVELOPMENT_GUIDE.md — Testing Addition

When adding the testing section to a block's entry, append under the mock data:

```md
**Tests:** `__tests__/blocks/HeroBlock.test.tsx`
- Renders title
- Renders subtitle
- Renders image with alt text
```
