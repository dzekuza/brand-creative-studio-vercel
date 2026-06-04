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
1. `/api/generate-image` — sends product image + up to 3 style refs + prompt to an image model as multimodal input; returns base64 PNG. Default model is `google/gemini-3.1-flash-image-preview` via the Vercel AI Gateway. Alternates (selectable via the request `model` field): `gemini-2.5-flash` (direct Google GenAI), `imagen-4` (gateway text-to-image), `gpt-image-2` (OpenAI). For full-AI renders (`fullAiMode`, text baked into the image) the route auto-routes to `gpt-image-2` when no model is chosen and `OPENAI_API_KEY` is set, since it has the best text fidelity; otherwise it stays on Gemini.
2. `buildCreativeHtml()` (`src/lib/html-compositor.ts`) — assembles an HTML document: generated image as background, custom font via `@font-face`, SVG icons injected, text overlaid using brand bible colors/typography. The AI-authored variant (`/api/compose-html`) uses `claude-sonnet-4-6` with a large static art-director system prompt sent as a cached (`cache_control: ephemeral`) `system` block — keep that prompt byte-identical so creatives in a session reuse the cached prefix; per-request brand context and copy go in the user message.
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
ANTHROPIC_API_KEY=   # Claude API (all text routes use claude-sonnet-4-6)
GEMINI_API_KEY=      # Google GenAI (gemini-2.5-flash direct path)
OPENAI_API_KEY=      # OpenAI (gpt-image-2; also enables full-AI-mode auto-routing)
```

The default Gemini 3.1 path and Imagen 4 go through the Vercel AI Gateway (no per-provider key needed beyond gateway auth).

Ad-type copy strategy (AIDA/PAS/BAB framing per ad type) has a single source of truth in `src/lib/ad-frameworks.ts` — `imageCopyHint`, `htmlCopyGuidance`, and `bulkFramework` are consumed by generate-image, compose-html, and generate-copy respectively. Don't reintroduce per-route copies.

Text-route temperatures: structured/JSON-extraction routes (brand-bible, scrape-products, review-image, generate-sketches) run at `temperature: 0`; creative-copy routes (generate-copy, and compose-html's copy-generating branch) run hot (~0.9).

## Tests

Unit tests cover `src/lib/` utilities only (platforms, html-compositor, brand-bible, ad-frameworks). Jest runs in Node environment with `ts-jest`. Tests for client-only code (color-extract) are omitted since it requires a browser canvas. API routes are not unit tested.
