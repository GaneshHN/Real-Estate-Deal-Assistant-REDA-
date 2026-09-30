# Real-Estate-Deal-Assistant (REDA)

A broker-focused CRM foundation for managing leads, properties, follow-ups, site visits, negotiations, and deals.

## Structure

- `client/` — React + Vite + TypeScript frontend
- `server/` — Express + TypeScript API
- `shared/` — Shared types
- `drizzle/` — Reserved for Drizzle schema and migrations

## Run locally

1. Copy `.env.example` to `.env` and add your Supabase connection values.
2. Install dependencies: `npm install`
3. Start both apps: `npm run dev`
4. Frontend: `http://localhost:5173`
5. API health check: `http://localhost:5000/api/health`

Individual commands: `npm run dev:client`, `npm run dev:server`.

## Checks

- `npm run typecheck`
- `npm run build`

No secrets are committed to the repository.

## Supabase Auth setup

The frontend uses Supabase Auth email/password sign-in. Configure these variables in the frontend and backend environments:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe)
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (API server)
- `ALLOWED_ORIGINS` with the deployed frontend origin

Enable Email provider authentication in Supabase Authentication settings and create users there. Assign authorization roles using `app_metadata.role` with one of `admin`, `broker`, or `agent`; roles are never accepted from frontend input. The API validates every bearer token with Supabase Auth, exposes `GET /api/auth/me`, and protects role-specific routes with server middleware. Never expose `SUPABASE_SERVICE_ROLE_KEY` or any secret key to the frontend.

The API expects `Authorization: Bearer <access_token>` for protected requests. Supabase Auth handles password hashing, sessions, refresh, and logout; no passwords are stored by this application.
