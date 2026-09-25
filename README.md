# Ankhi Tribute

High-fidelity, data-driven tribute site built with Next.js App Router, TypeScript, GSAP, Lenis, and dynamically loaded Three.js. The temporary content module is an Ousmane Dembélé reference; all reusable components consume generic person and chapter data.

## Stack

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- GSAP, ScrollTrigger, DrawSVGPlugin, and `@gsap/react`
- Lenis smooth scrolling on capable desktop viewports
- Three.js particle and Ballon Dor scenes loaded client-side only
- Vitest, ESLint, and OpenNext
- Cloudflare Workers via the stable `@opennextjs/cloudflare` adapter

OpenNext was selected over vinext because it is the standard Cloudflare adapter, has a stable release compatible with the installed Next.js version, and keeps the normal `next build` output as the source of truth.

## Requirements

- Node.js 22 or newer
- npm
- FFmpeg on `PATH` for reference audio extraction and local fallback generation

## Setup

```bash
npm install
npm run assets:core
npm run assets:download
npm run assets:validate
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:worker
```

`npm run verify` runs asset validation, lint, type checking, tests, the Next.js build, and the Worker build.

## Content Personalization

1. Create a typed person module next to `src/content/ousmane.ts`.
2. Keep names, colors, text, statistics, galleries, videos, audio, scenes, and credits in that module.
3. Call `validatePersonContent` before exporting the module.
4. Change the single export in `src/content/config.ts`; both the page and metadata layout consume it.
5. Replace local media under `public/assets/` and update only the data paths.

The schema lives in `src/content/schema.ts`. Components must not contain a subject name, club name, or reference-only selector. Mobile and reduced-motion layouts are driven by CSS, not subject-specific branches.

## Media

The default development profile uses local files under `public/assets/reference/`. These files are temporary, `reference-only`, and excluded from Git and Worker deployment.

Refresh the reference package with:

```bash
npm run assets:download
npm run assets:validate
```

The downloader uses an explicit allowlisted catalog, HTTPS-only requests, bounded concurrency, rate limiting, retries, atomic writes, SHA-256 hashing, and source-code/analytics exclusions. It stages responsive image variants, 11 fonts, 19 videos, the model, HDR/texture assets, the reference audio track, and 760 sequence frames in batches of 152.

The generated manifest is `public/assets/reference/manifest.json`. The current catalog contains 904 files (about 157 MiB), including 760 sequence frames. Each entry includes:

- source URL
- category
- local public path
- byte size
- content type
- SHA-256 digest
- rights status

Use `npm run assets:download -- --skip-frames` for a faster media-only refresh, `--force` to replace existing files, or `--concurrency=2` to reduce network pressure.

Reference media must not be published. The Worker build runs `scripts/prepare-worker-assets.mjs`, which removes every reference directory from `.open-next/assets` and fails if any remains.

Reusable deployable fallbacks are generated in `public/assets/core/` by:

```bash
npm run assets:core
```

For a new subject, use owned or licensed files in a non-reference directory. `ASSET_PROFILE=owned` maps temporary reference paths to core fallbacks and disables loading the reference model.

## R2-Compatible Media

Media paths are stored as local `/assets/...` paths. To serve owned subject media from a public R2 bucket or compatible origin, set:

```bash
NEXT_PUBLIC_MEDIA_BASE_URL=<your-public-media-base-url>
```

`src/lib/media.ts` joins that base with local data paths. Do not hotlink the reference CDN from application content.

## Accessibility and Fallbacks

The server response includes French document semantics, one `h1`, a skip link, navigation, all chapter text, media descriptions, statistics, audio controls, and footer credits. JavaScript enhances these elements but does not create the core reading order.

The experience provides:

- native mobile scrolling and block-level chapter layouts
- no horizontal pinning on small screens
- no GSAP pinning, Lenis, WebGL, autoplay, or smooth scrolling with reduced motion
- poster and core-image fallbacks for failed media
- a non-WebGL hero and footer composition
- keyboard and pointer support for hold-to-play audio
- automatic preloader timeout and a CSS-only hidden terminal state

## Cloudflare Workers

Build the OpenNext output without deploying:

```bash
npm run build:worker
```

Preview locally:

```bash
npm run preview:worker
```

Deployment is intentionally available but was not run during implementation:

```bash
npm run deploy:worker
```

`wrangler.jsonc` uses `.open-next/worker.js`, Worker static assets, `nodejs_compat`, and `global_fetch_strictly_public`. It does not define a custom domain, analytics, secrets, or provisioned R2 resources. Add environment secrets locally through `.dev.vars` or through Cloudflare environment settings without committing them.

Useful Wrangler commands:

```bash
npx wrangler types
npm run cf-typegen
```

## Project Structure

- `app/` — App Router shell, page composition, and design system
- `src/content/` — typed schema and temporary subject data
- `src/components/` — generic server sections and client islands
- `src/motion/` — GSAP, ScrollTrigger, DrawSVG, and Lenis orchestration
- `src/scenes/` — dynamic Three.js enhancement
- `scripts/` — core generation, reference staging, validation, and Worker asset filtering
- `tests/` — content contracts, server rendering, and component-boundary checks
- `public/assets/core/` — deployable reusable visual/audio fallbacks
- `public/assets/reference/` — local-only temporary reference package
