# Noxy

Noxy is a small hobby Nuxt app for browsing anime, checking details, saving watch progress, and opening third-party watch embeds.

It does not host anime videos. The app uses local Nitro API routes to fetch and clean anime metadata before the frontend renders it.

## Stack

- Nuxt 4 and Vue 3
- Nitro server routes
- MyAnimeList API for anime metadata
- Pinia for local state
- Optional Supabase auth/profile/watchlist sync
- UnoCSS and Iconify icons
- Bun, Vitest, ESLint, and oxfmt

## Setup

Install dependencies:

```bash
bun install
```

Create your env file:

```bash
cp .env.example .env
```

Add at least:

```bash
MAL_CLIENT_ID=your_mal_client_id
```

Run the app:

```bash
bun run dev
```

Open the URL Nuxt prints, usually:

```text
http://localhost:3000
```

## Env Vars

Required:

```bash
MAL_CLIENT_ID=your_mal_client_id
```

Optional:

```bash
MAL_API_BASE_URL=https://api.myanimelist.net/v2
MAL_CLIENT_SECRET=your_mal_client_secret
ANIME_NEWS_API_BASE_URL=https://aninews.vercel.app
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase is only needed for login, public profiles, avatar uploads, and synced watchlists. Local browsing works without it.

## Scripts

```bash
bun run dev          # start local dev server
bun run build        # production build
bun run preview      # preview production build
bun run lint         # eslint
bun run lint:fix     # eslint autofix
bun run typecheck    # nuxt/vue typecheck
bun run test:run     # run tests once
bun run test         # vitest watch mode
bun run format       # format with oxfmt
```

## Project Map

```text
app/
  components/      UI components
  composables/     reusable client logic
  pages/           Nuxt pages
  stores/          Pinia stores
server/
  api/myanimelist/ local anime API routes
  middleware/      API rate limiting
  utils/           MAL mapping and filtering helpers
shared/
  utils/           shared app/test utilities
supabase/
  migrations/      optional auth/profile/watchlist setup
tests/
  composables/     composable tests
  nuxt/            component tests
  server/          server utility tests
```

## API Notes

Frontend pages call local routes under `/api/myanimelist/*`.

Useful places:

- `server/api/myanimelist/` - route handlers
- `server/utils/mal.ts` - MAL fetch, mapping, filtering, score/status helpers
- `shared/utils/episodeAvailability.ts` - available episode counting

Current home-page behavior:

- Spotlight uses current-year TV anime only.
- Spotlight only shows `RELEASING` anime with available episodes.
- Spotlight sorts by highest MAL score percent first.
- Trending uses current-year anime.
- Chinese-origin cues are hidden from spotlight/trending.
- Japanese-origin cues are prioritized when sorting.

## Checks

Before pushing changes, I usually run:

```bash
bun run lint
bun run typecheck
bun run test:run
```

## Notes

This is a personal/hobby project, so the code favors simple local routes and practical cleanup over a big backend.

Metadata, artwork, schedules, scores, and embed availability come from third-party sources and can be incomplete or wrong. Noxy is not a streaming host and should not be treated as one.
