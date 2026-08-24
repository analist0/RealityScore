# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RealityScore (`realityscore-israel`) — a location-based trust/rating system in Hebrew (RTL). Users search for a locality/business, confirm a location-verified visit, answer a guided review flow (promise vs. reality), and optionally upload photo/receipt evidence. MVP scope: search, RealityScore cards, guided Hebrew review flow, R2 evidence uploads, D1-backed reviews, and a first pilot for the village כלנית (Kalanit). Live MVP: https://realityscore-israel.analist009.chatgpt.site

## Stack

- Next.js App Router (v16, React 19, TypeScript) run through **vinext** (a Next.js-on-Cloudflare-Workers adapter), not the standard Next.js dev server/build.
- **Vite** is the actual dev/build tool (`vite.config.ts`), orchestrating the `vinext`, `sites`, and `@cloudflare/vite-plugin` plugins.
- **Cloudflare Workers** runtime — D1 (SQLite) for data, R2 for evidence file storage. `worker/index.ts` is the Worker entry point (handles image optimization, then delegates to vinext's app-router handler).
- **Drizzle ORM** (`drizzle-orm/d1`) + **drizzle-kit** for schema/migrations against D1.
- Tailwind CSS v4 (via `@tailwindcss/postcss`).

## Commands

```bash
npm run install:ci    # sandboxed npm ci (see "Runtime env wrapper" below) — use instead of plain `npm ci`
npm run dev            # vite dev server (wraps wrangler/miniflare for local D1/R2 bindings)
npm run build           # bounded vinext production build (via scripts/build-verified.sh)
npm start                # vinext start — serve the production build
npm test                  # build, then run tests/rendered-html.test.mjs against dist output
npm run lint               # eslint . (ignores dist/.next)
npm run db:generate         # drizzle-kit generate — regenerate SQL migrations from db/schema.ts after schema changes
```

There is a single test file (`tests/rendered-html.test.mjs`, run with Node's built-in test runner) that asserts on the built worker's HTML output — it requires `npm run build` to have produced `dist/server/index.js` first, which is why `npm test` always builds before running it. There's no way to run "a single test" separately from the build; to iterate on the assertion, edit the test file and rerun `npm test`.

## Runtime env wrapper (`scripts/sites-env.sh`)

`npm run install:ci`, `npm run build`, and `npm run lint` all shell out through `scripts/sites-env.sh`, which redirects `HOME`, npm cache, Wrangler logs, and Miniflare registry into `.sites-runtime/` (gitignored) before running the real command. This keeps the sandboxed build environment's writes project-local and reproducible. If you invoke `eslint`, `drizzle-kit`, or other project-local binaries directly rather than through the `npm run` scripts, prefix with `scripts/sites-env.sh --` (e.g. `scripts/sites-env.sh -- eslint .`) or the tool may look for config/cache in the wrong `HOME`.

`scripts/install-ci.sh` additionally does integrity-verification of the `vinext` tarball against `package-lock.json` before running `npm ci`, and takes a `flock` to refuse overlapping installs — don't route around it with a bare `npm ci` in this repo.

`scripts/build-verified.sh` runs `vinext build` under a `timeout` (default 3m, `SITES_BUILD_TIMEOUT` / `SITES_BUILD_KILL_AFTER` to override).

## Architecture

- **`app/`** — Next.js App Router source. `app/page.tsx` is the entire MVP UI as one client component (search, business cards, and the multi-step review modal); `app/layout.tsx` sets `lang="he" dir="rtl"` and metadata. `app/api/reviews/route.ts` is the only API route: it accepts a review submission (`FormData`), writes a `reviews` row via Drizzle, uploads each evidence image to R2, and writes matching `evidence` rows. `app/chatgpt-auth.ts` reads ChatGPT-platform auth headers (`oai-authenticated-user-*`) injected by the hosting layer — use `getChatGPTUser`/`requireChatGPTUser` rather than parsing those headers directly.
- **`db/`** — `db/schema.ts` defines three Drizzle SQLite tables: `businesses` (candidate/verified businesses with source evidence), `reviews` (guided-flow answers + generated draft + moderation status), `evidence` (uploaded files, referencing R2 object keys). `db/index.ts#getDb()` is the only way routes should obtain a Drizzle client — it reads the `DB` binding from `cloudflare:workers` and throws a descriptive error if unbound.
- **`drizzle/`** — generated SQL migrations + snapshot metadata; regenerate with `npm run db:generate` after editing `db/schema.ts`, never hand-edit.
- **`worker/index.ts`** — the actual Cloudflare Worker `fetch` handler. Intercepts `/_vinext/image` for Cloudflare Images-based optimization, otherwise delegates to vinext's app-router request handler. This is the `main` entry wired into both `vite.config.ts` (dev bindings) and the Worker deploy target.
- **`build/sites-vite-plugin.ts`** — a Vite plugin (`sites()`) that runs at the end of the production build (`closeBundle`) to copy `.openai/hosting.json` and the `drizzle/` migrations directory into `dist/.openai/`, so the hosting platform can read binding config and apply migrations post-deploy.
- **`.openai/hosting.json`** — declares the Cloudflare binding names this app expects (`d1`, `r2`) plus the hosting `project_id`. `vite.config.ts` reads this file to configure local D1/R2 bindings (via a placeholder DB id) for `wrangler`/Miniflare during `npm run dev`.
- **`examples/d1/`** — a standalone reference example (separate `app/`/`db/` tree) showing a minimal D1 CRUD route with Drizzle; it is not wired into the real app's routing or build and exists only as a pattern to copy from.

## Conventions

- Application code (`app/`, `db/`) is written in a dense, no-whitespace style (minimal line breaks, compact JSX) — match existing formatting when editing those files rather than reformatting.
- All user-facing strings are Hebrew, and pages render RTL (`dir="rtl"`); keep new UI copy in Hebrew and RTL-correct.
- API routes return errors as `Response.json({ error: message }, { status })`; follow that shape for new routes.
- Access Cloudflare bindings (D1, R2) via `env` from `cloudflare:workers`, and D1 specifically via `getDb()` — don't instantiate Drizzle clients ad hoc in routes.
