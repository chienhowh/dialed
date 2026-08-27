# Dialed

Dialed is a mobile-first coffee brewing assistant. The current implementation is the Milestone 1 application foundation; product features and Supabase integration intentionally come later.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

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

Supabase variables are intentionally deferred to Milestone 2.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The Playwright harness starts the local Next.js development server automatically unless `PLAYWRIGHT_BASE_URL` points to an already-running deployment.
