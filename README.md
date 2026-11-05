# ABHI Learning HUB

Learning & development portal for ABHI: employee training, virtual sessions with
certificates, evaluations, surveys, TNA, leaderboard, ideas, messaging and an
admin dashboard.

Built with TanStack Start (React 19, SSR), Tailwind CSS and Supabase. The
project is connected to [Lovable](https://lovable.dev); commits pushed here sync
back to the Lovable editor.

## Running on Node.js

Requirements: **Node.js 22.9+** and npm.

```sh
cp .env.example .env      # fill in the values (see below)
npm install
npm run dev               # development server with HMR (http://localhost:8080)
```

Production:

```sh
npm run build             # outputs a standalone Node server in .output/
npm start                 # node .output/server/index.mjs (reads .env if present)
```

`npm start` listens on `PORT` (default `3000`) and `HOST`. The `.output/`
folder is self-contained: you can copy it to a server and run
`node .output/server/index.mjs` there without `node_modules`. To build for a
different host, set `NITRO_PRESET` (e.g. `NITRO_PRESET=vercel npm run build`).

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | build time, browser | Supabase client in the browser |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server | Supabase client during SSR / server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | server, **secret** | Admin operations (user management, certificates, reports) |
| `LOVABLE_API_KEY` | server, **secret** | AI coach (Lovable AI gateway) |
| `LOVABLE_ASSETS_ORIGIN` | server | Published Lovable URL; images under `/__l5e/assets-v1/` (logo, mascot, signatures) are proxied from it |
| `PORT`, `HOST` | server | Listen address for `npm start` |

The `VITE_*` values are baked into the browser bundle, so rebuild after
changing them. Never give a secret a `VITE_` prefix.

### Database

SQL migrations live in `supabase/migrations/` and `drizzle/migrations/`
(schema in `drizzle/schema.ts`). Apply them to your Supabase project with the
Supabase CLI or `npx drizzle-kit migrate` (set `LOVABLE_DB_MIGRATION_URL` to the
Postgres connection string).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (Node server in `.output/`) |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` / `npm run format` | ESLint / Prettier |
