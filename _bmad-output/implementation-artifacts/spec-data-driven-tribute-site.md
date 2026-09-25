---
title: 'Build a data-driven interactive tribute site'
type: 'feature'
created: '2026-09-25'
status: 'done'
review_loop_iteration: 0
baseline_commit: '085914c36470c7c79244ce1b9d5f1b017eed6291'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository is an empty scaffold, but the requested experience is a high-fidelity, single-page tribute site inspired by `https://www.ousmaneballondor.fr/`. The result must preserve the reference site's editorial structure and motion while allowing a different person's content and media to be swapped later without rewriting components.

**Approach:** Build a Next.js App Router application with typed person/chapter data, server-rendered semantic content, isolated client motion components, GSAP/ScrollTrigger/Lenis/Three.js enhancements, progressive fallbacks, and Cloudflare Workers deployment configuration. Use public reference media as temporary local content, clearly separated from reusable configuration and subject assets.

## Boundaries & Constraints

**Always:** Keep person-specific text, colors, statistics, galleries, media, audio, and credits data-driven; render readable HTML before enhancement; provide desktop/mobile, no-WebGL, reduced-motion, and no-JavaScript fallbacks; keep GSAP setup client-only and cleaned up; configure Cloudflare Workers deployment without committing secrets; verify builds and asset paths.

**Ask First:** Publishing person-specific reference media publicly; purchasing or changing a domain; creating Cloudflare R2 resources; deploying to a custom domain; adding analytics or tracking copied from the reference site.

**Never:** Copy the reference site's private Webflow source, analytics identifier, or dead redirect; hard-code the reference player, clubs, or asset URLs into animation selectors; expose credentials; claim byte-for-byte source equality; allow missing media to leave the page blank.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Happy path | Valid person and chapter data | Full semantic page with enhanced motion | Build reports missing fields |
| Media swap | Replacement gallery/video/poster paths | Layout and timelines remain intact | Use configured poster or static fallback |
| Reduced motion | `prefers-reduced-motion: reduce` | No pinning, WebGL, autoplay, or wheel interception | Static content remains visible |
| WebGL failure | Unsupported or failed scene | Hero/footer use non-WebGL visual fallback | Loader times out open |
| Small screen | Width at or below mobile breakpoint | Native scrolling, compact navigation, video/media fallbacks | No horizontal overflow |

</frozen-after-approval>

## Code Map

- `app/layout.tsx` -- Global metadata, language, fonts, and static shell.
- `app/page.tsx` -- Server composition of the configured tribute page.
- `app/globals.css` -- Reference-inspired design system, layout, and responsive rules.
- `src/content/schema.ts` -- Typed person, chapter, media, and asset contracts.
- `src/content/ousmane.ts` -- Temporary reference content and asset paths.
- `src/components/*` -- Server-rendered page sections and client motion islands.
- `src/motion/*` -- GSAP registration, scroll orchestration, and cleanup.
- `src/scenes/*` -- Dynamic Three.js hero/footer scenes with static fallbacks.
- `public/assets/*` -- Local reference media and reusable assets.
- `wrangler.jsonc` -- Cloudflare Workers build and asset configuration.
- `scripts/*` -- Asset inventory/validation and verification helpers.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `app/*`, `src/*` -- Scaffold the typed page and reference-inspired sections.
- [x] `src/motion/*`, `src/scenes/*` -- Add GSAP, Lenis, Three.js, audio, and responsive fallbacks.
- [x] `public/assets/*`, `scripts/*` -- Stage public reference media and generate a manifest.
- [x] `wrangler.jsonc` -- Configure Workers deployment for the built Next application.
- [x] `tests/*` -- Validate content contracts and critical render behavior.

**Acceptance Criteria:**
- Given valid reference data, when the home page renders, then the hero, introduction, all chapters, footer, credits, and audio control are present as semantic HTML.
- Given a person-data swap, when the build runs, then navigation, metadata, statistics, themes, galleries, and media update without component edits.
- Given reduced motion or failed WebGL, when the page loads, then all content is readable and no loader deadlock occurs.
- Given the production build, when lint, typecheck, tests, and Worker build run, then each command succeeds and no secret is emitted.

## Design Notes

The page should match the reference's visual rhythm—grain, oversized typography, pinned horizontal chapter tracks, jersey media, gallery parallax, feature-video reveals, and a WebGL footer—without copying its Webflow implementation. All components consume generic chapter fields; subject-specific values remain in one content module.

## Verification

**Commands:**
- `npm run lint` -- ESLint completes without errors.
- `npm run typecheck` -- TypeScript completes without errors.
- `npm test` -- Content and rendering checks pass.
- `npm run build` -- Next production build succeeds.
- `npm run build:worker` -- Cloudflare Worker output succeeds.

## Suggested Review Order

**Composition and data boundary**

- Compose the server page from one configured person and an explicit asset profile.
  [`page.tsx:21`](../../app/page.tsx#L21)

- Strip reference-only media before owned Worker content reaches client component props.
  [`media.ts:67`](../../src/lib/media.ts#L67)

- Keep chapter, media, dimension, and swap contracts validated at the content boundary.
  [`schema.ts:207`](../../src/content/schema.ts#L207)

- Supply temporary subject content without coupling it to generic components.
  [`ousmane.ts:51`](../../src/content/ousmane.ts#L51)

**Motion and interaction**

- Scope Lenis, ScrollTrigger, pinning, and cleanup to desktop non-reduced motion.
  [`setup.ts:18`](../../src/motion/setup.ts#L18)

- Render the reusable chapter track, feature media, stats, and gallery.
  [`ChapterTrack.tsx:16`](../../src/components/ChapterTrack.tsx#L16)

- Opt into horizontal enhancement only after client initialization; preserve stacked no-JS reading order.
  [`globals.css:588`](../../app/globals.css#L588)

**Assets and deployment**

- Catalog reference media, responsive variants, frames, scene assets, and provenance.
  [`reference-assets.mjs:242`](../../scripts/reference-assets.mjs#L242)

- Bound, retry, preserve, and merge asset downloads safely.
  [`download-reference-assets.mjs:117`](../../scripts/download-reference-assets.mjs#L117)

- Configure OpenNext output for Cloudflare Workers without reference media.
  [`wrangler.jsonc:1`](../../wrangler.jsonc#L1)

**Verification**

- Assert owned content contains no reference paths and frame manifests remain coherent.
  [`content.test.ts:36`](../../tests/content.test.ts#L36)

- Assert semantic server output preserves the complete readable outline.
  [`render.test.tsx:13`](../../tests/render.test.tsx#L13)
