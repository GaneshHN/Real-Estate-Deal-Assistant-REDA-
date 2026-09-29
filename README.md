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
