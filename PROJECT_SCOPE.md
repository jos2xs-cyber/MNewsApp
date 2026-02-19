# Project Scope Quick Reference

## Purpose
This file is a fast technical snapshot of the app so contributors and agents can quickly understand scope, setup, and key code paths. It complements `README.md`, which remains the full setup and usage guide.

## System Snapshot
- Monorepo using npm workspaces:
  - `backend`: Node.js + Express + TypeScript + SQLite (`sqlite3`)
  - `frontend`: React + Vite + TypeScript + Tailwind
- Default local endpoints:
  - Frontend: `http://localhost:5175`
  - Backend API: `http://localhost:3001/api`

## Local Runbook
1. Install dependencies:
   - `npm install`
2. Start both apps in dev:
   - `npm run dev`
3. Build both apps:
   - `npm run build`
4. Start backend built output:
   - `npm run start`

Notes:
- Backend loads env from `backend/.env` first; if missing, it falls back to root `.env`.

## Required Environment Inputs
- Always required by backend validation:
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`
  - `AI_PROVIDER` (`openai`, `anthropic`, or `auto`)
  - Provider key requirements:
    - `openai`: `OPENAI_API_KEY`
    - `anthropic`: `ANTHROPIC_API_KEY`
    - `auto`: at least one of `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Optional auth/network controls:
  - `API_TOKEN` (backend token gate)
  - `VITE_API_TOKEN` (frontend token header)
  - `BACKEND_HOST` (default `127.0.0.1`)
  - `CORS_ORIGINS` (comma-separated allowlist)

## High-Level Data Flow
1. Config data (sources/topics/settings/allowed domains) comes from SQLite.
2. Digest run sequence:
   - scrape candidate articles
   - rank and summarize
   - generate digest result
   - optionally send email
   - persist digest history
3. Scheduler triggers digest runs based on cron in settings.

## Core Backend Entry Points
- `backend/src/server.ts`
  - env validation, CORS/rate limiting/auth middleware, route mounting, startup
- `backend/src/services/digestRunner.ts`
  - digest orchestration, dedupe window, queue handling, history persistence
- `backend/src/services/emailer.ts`
  - SMTP transport and newsletter HTML/text construction
- `backend/src/services/weather.ts`
  - forecast fetch/parsing (`wttr.in` Bedford endpoint)
- `backend/src/utils/sanitize.ts`
  - text sanitization/escaping used across scraping and email rendering
- `backend/src/db/schema.ts`
  - DB initialization and seed behavior
- `backend/src/db/queries.ts`
  - settings, history, and CRUD query layer

## Core Frontend Entry Points
- `frontend/src/App.tsx`
  - dashboard shell and tab navigation (weather is not rendered in UI)
- `frontend/src/api/client.ts`
  - Axios base URL logic and optional API token header
- `frontend/src/hooks/*`
  - React Query-backed API hooks
- `frontend/src/components/*`
  - management UI panels and status/test controls

## Current Functional Boundaries
- Weather is currently available from backend route `/api/weather`.
- Weather is fetched during digest email sends in `backend/src/services/digestRunner.ts`.
- Newsletter content is built in `backend/src/services/emailer.ts`, including a compact 3-day Bedford, TX weather section near the top of the email body.
- Weather icons are determined from forecast description text in `backend/src/services/emailer.ts` so icons still show when remote images are blocked.
- Weather is not rendered in the dashboard UI from `frontend/src/App.tsx`.
- Article link labels in newsletter cards show domain-only text while linking to full article URLs.
- Sanitization decodes then escapes entities to prevent visible artifacts like `&amp;` in titles.

## Troubleshooting Shortlist
- Digest sends but content is empty:
  - check source URLs, allowed domains, and scraper output path
- SMTP auth failures:
  - verify Gmail App Password + 2FA setup and env values
- API unauthorized errors:
  - confirm `API_TOKEN` and `VITE_API_TOKEN` match
- LAN/CORS access issues:
  - confirm `BACKEND_HOST=0.0.0.0` and correct `CORS_ORIGINS`
- Weather section/icon issues in email:
  - Digest fetch path: `backend/src/services/digestRunner.ts`
  - Email render path: `backend/src/services/emailer.ts`
- Title text showing escaped entities (`&amp;`):
  - sanitize path: `backend/src/utils/sanitize.ts`

## Change Checklist
- If changing digest email content:
  - verify `backend/src/services/digestRunner.ts` and `backend/src/services/emailer.ts`
- If changing dashboard-only rendering:
  - verify `frontend/src/App.tsx` and affected components
- If adding config/env:
  - update backend validation in `backend/src/server.ts`
  - update docs in `README.md` and this file

## Maintenance
Update this file whenever startup scripts, env requirements, routes, or digest flow behavior change.
