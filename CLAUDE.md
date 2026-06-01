# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js version

This project runs **Next.js 16** which has breaking changes from Next.js 13/14/15. Read `node_modules/next/dist/docs/` before writing any code. Do not rely on training-data knowledge of Next.js APIs — verify against installed docs.

## Commands

```bash
npm run dev       # start dev server on localhost:3000
npm run build     # production build (Turbopack)
npm test          # run Jest unit tests
npx jest src/lib/platforms.test.ts   # run a single test file
npx tsc --noEmit  # typecheck without emitting
```

## Architecture

Two-phase personal tool — no auth, no database.

**Phase 1 — Brand Setup (`/setup`)**
User fills in product info and uploads files (product image, style reference images, font, SVGs). `ProductForm` calls `/api/upload` for each file, extracts dominant colors from style refs client-side via `colorthief` (`src/lib/color-extract.ts`), then POSTs to `/api/brand-bible` which calls Claude (`claude-sonnet-4-6`) and returns a `BrandBible` JSON. The bible is saved to `localStorage`; uploaded asset URLs are saved to `sessionStorage`.

**Phase 2 — Creative Generation (`/generate`)**
`GenerateForm` orchestrates three sequential API calls per creative:
1. `/api/generate-image` — sends product image + up to 3 style refs + prompt to Gemini (`gemini-2.5-flash-image`) as multimodal input; returns base64 PNG
2. `buildCreativeHtml()` (`src/lib/html-compositor.ts`) — assembles an HTML document: Gemini image as background, custom font via `@font-face`, SVG icons injected, text overlaid using brand bible colors/typography
3. `/api/render` — Puppeteer loads that HTML at exact platform dimensions, screenshots it, returns base64 PNG

Results are shown in `CreativeGrid` with per-card download and "Download All as ZIP" (jszip, dynamically imported).

## Key types (`src/types/index.ts`)

- `BrandBible` — colors (primary/secondary/accent/background/text), typography (headingSize/bodySize/weight/letterSpacing as strings with units e.g. `"48px"`), layout (padding, logoPosition), tone, tagline?, rules[]
- `UploadedAssets` — productImageUrl, styleRefUrls[], fontUrl, fontName, iconUrls[]
- `Creative` — id, pngBase64, platform, status ('pending'|'generating'|'done'|'error')
- `CompositorInput` — everything `buildCreativeHtml` needs to produce the HTML string

## File storage

Uploaded files go to `public/uploads/<uuid>.<ext>` (gitignored). The upload route validates extensions and path-traverses safely — only `/uploads/<uuid>.<ext>` paths accepted in `generate-image`.

## Puppeteer

`puppeteer` is excluded from webpack bundling via `serverExternalPackages: ['puppeteer']` in `next.config.ts`. The render route uses headless Chrome with `--no-sandbox`. Fonts must be loaded via `@font-face` pointing at the file URL — Puppeteer calls `document.fonts.ready` before screenshotting.

## Env vars

```
ANTHROPIC_API_KEY=   # Claude API
GEMINI_API_KEY=      # Google GenAI
```

## Tests

Unit tests cover `src/lib/` utilities only (platforms, html-compositor, brand-bible). Jest runs in Node environment with `ts-jest`. Tests for client-only code (color-extract) are omitted since it requires a browser canvas. API routes are not unit tested.
