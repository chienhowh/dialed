# Dialed

Dialed is a mobile-first coffee brewing assistant for choosing a taste goal, generating a Brew Plan, guiding a brew, recording feedback, and iterating through a dial-in history. The current implementation covers the MVP through Milestone 8.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop or another Docker-compatible runtime for local Supabase

## Local setup

```bash
nvm use
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment contract

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | Preview/production | Canonical origin used by application metadata and the Google OAuth callback. Local development falls back to `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase key used by browser and SSR clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local tests only | Creates and removes isolated Auth test users. Never expose this value to the browser. |

## Google OAuth setup

Google OAuth is the only user-facing authentication method for the Private Beta. Supabase Auth remains the identity and session authority.

The OAuth flow has two distinct callback layers:

```text
Dialed
→ Supabase Auth
→ Google
→ Supabase /auth/v1/callback
→ Dialed /auth/callback
→ exchangeCodeForSession()
→ /
```

Configure the Google OAuth Web Client's **Authorized redirect URI** to point to Supabase Auth, not directly to Dialed:

- Hosted: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- Local Supabase: `http://127.0.0.1:54321/auth/v1/callback`

In the hosted Supabase Dashboard, enable the Google provider and configure the production Site URL. The Redirect URLs allowlist must include `https://dialed-mu-peach.vercel.app/auth/callback` or the intentionally configured `https://dialed-mu-peach.vercel.app/**` production glob. Hosted provider credentials remain in Supabase and must not be added to the Dialed or Vercel application environment.

Local provider configuration lives in `supabase/config.toml`. Before starting or restarting local Supabase, supply its environment-backed credentials in the current shell:

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="<local-google-client-id>"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET="<local-google-client-secret>"
npm run db:start
```

Do not commit the real values. The client secret must never use a `NEXT_PUBLIC_` name and must not be placed in Vercel app environment variables. `APP_URL` controls the Dialed callback origin; locally it resolves to `http://localhost:3000/auth/callback`. OAuth cannot work until the corresponding Google provider is enabled and its credentials are available.

## Local Supabase

```bash
npm run db:start
npm run db:reset
npm run test:db
```

`db:reset` recreates the local database from migrations. Required official recipe reference data is installed by a versioned migration; `seed.sql` is intentionally not a production dependency.

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
