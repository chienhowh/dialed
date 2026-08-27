# Dialed

Dialed is a mobile-first coffee brewing assistant. The current implementation is the Milestone 1 application foundation; product features and Supabase integration intentionally come later.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop or another Docker-compatible runtime for local Supabase

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment contract

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | Preview/production | Canonical origin used by application metadata. Local development falls back to `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase key used by browser and SSR clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local tests only | Creates and removes isolated Auth test users. Never expose this value to the browser. |

## Local Supabase

```bash
npm run db:start
npm run db:reset
npm run test:db
```

`db:reset` recreates the local database from migrations and applies the reproducible official recipe seed.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm run build
```

The Playwright harness reads the local Supabase connection from the CLI, builds the application with those values, and starts the production server automatically. Set `PLAYWRIGHT_BASE_URL` only when testing an already-running deployment with matching Supabase test credentials.
