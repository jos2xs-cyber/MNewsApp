# Daily AI News Digest System

## Recent Changes
- 2026-02-17: Weather forecast moved from dashboard UI to digest email content.
- 2026-02-17: Digest email now includes a compact 3-day Dallas forecast section near the top.
- 2026-02-17: Weather icons now use backend description-based mapping so icons render even when remote images are blocked by email clients.
- 2026-02-17: Weather location updated to Bedford, TX for newsletter forecasts.
- 2026-02-17: Newsletter article links now display domain-only text (full article URL remains the click target).
- 2026-02-17: HTML entity handling fixed in text sanitization so titles do not show artifacts like `&amp;`.

## Overview
Local-first automated news digest with:
- Configurable source/topic/domain management UI
- AI summarization + ranking via OpenAI and/or Anthropic
- Daily scheduler + manual test send
- Gmail delivery using App Password
- SQLite configuration/history storage

## Features
 - Source CRUD (`business`, `tech`, `finance`, `lifestyle`, `local`, `food`)
- Topic CRUD
- Allowed-domain whitelist CRUD
- Settings management (email, cron, limits, paywall skip)
- Digest preview/send/status endpoints
- Digest history with pagination and deletion
- 3-day Bedford, TX weather forecast included in digest emails (with built-in forecast icons)
- React dashboard with tabs and live status footer

## Security features
- Required env validation on backend startup
- No secrets in code or DB
- HTTPS-only scraping URLs
- Domain whitelist enforcement for scraping
- Prepared statements for all SQL operations
- Request timeout (10s) for HTTP fetches
- API rate limiting (Express)
- OpenAI per-run cap (50 calls)
- CORS restricted to localhost
- Backend bound to localhost only
- Optional API token auth (`API_TOKEN` / `VITE_API_TOKEN`)
- LAN access can be enabled explicitly with `BACKEND_HOST` + `CORS_ORIGINS`

## Prerequisites
- Node.js 18+
- npm 9+
- Gmail account with 2FA enabled
- OpenAI API key and/or Anthropic API key

## Installation
1. Copy `.env.example` values into `backend/.env` and `frontend/.env` as needed.
2. Set backend secrets:
   - `AI_PROVIDER` (`openai`, `anthropic`, or `auto`)
   - `OPENAI_API_KEY` and `OPENAI_MODEL` (if using OpenAI)
   - `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (if using Anthropic)
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - optional `API_TOKEN` for local API authentication
   - optional LAN config:
     - `BACKEND_HOST=0.0.0.0`
     - `CORS_ORIGINS=http://localhost:5175,http://127.0.0.1:5175,http://<YOUR_PC_LAN_IP>:5175`
   - Recipients: list up to 3 emails (comma or newline separated)
3. Install deps at repo root:
   - `npm install`
4. Start dev servers:
   - `npm run dev`
5. Open dashboard:
   - `http://localhost:5175`
6. If using API token auth, set the same value in frontend env:
   - `VITE_API_TOKEN=<same as API_TOKEN>`

## iPad / LAN access
1. Find your PC LAN IP (example `192.168.1.97`).
2. Set backend env:
   - `BACKEND_HOST=0.0.0.0`
   - `CORS_ORIGINS=http://localhost:5175,http://127.0.0.1:5175,http://192.168.1.97:5175`
3. Keep token auth enabled:
   - `API_TOKEN=<random-long-token>`
   - `VITE_API_TOKEN=<same token>`
4. Start dev and open on iPad:
   - `http://192.168.1.97:5175`

## Gmail App Password setup
1. Enable Google 2-Step Verification.
2. Open Google Account > Security > App Passwords.
3. Create a mail app password and copy the 16-char token.
4. Put token in `GMAIL_APP_PASSWORD`.

Security warning: never use your normal Gmail password in this app.

## AI provider setup
- OpenAI:
  - Put key in `OPENAI_API_KEY`
  - Choose model with `OPENAI_MODEL`
- Anthropic:
  - Put key in `ANTHROPIC_API_KEY`
  - Choose model with `ANTHROPIC_MODEL`
- Provider mode:
  - `AI_PROVIDER=openai`: OpenAI only
  - `AI_PROVIDER=anthropic`: Anthropic only
  - `AI_PROVIDER=auto`: try OpenAI first, fallback to Anthropic on quota/rate-limit errors

## First run behavior
- SQLite DB auto-created at `backend/database.sqlite`.
- Seeds default sources/topics/allowed domains/settings.

## API
Base URL: `http://localhost:3001/api`
- `GET/POST/PUT/DELETE /sources`
- `GET/POST/PUT/DELETE /topics`
- `GET/PUT /settings`
- `POST /digest/generate`
- `POST /digest/send`
- `GET /digest/status`
- `GET /history`
- `GET /history/:id`
- `DELETE /history/:id`
- `GET/POST/PUT/DELETE /allowed-domains`
- `GET /weather`
- `GET /health`

## Scheduler
- Uses cron expression stored in settings (`schedule_time`).
- Timezone follows local machine.
- Reloads automatically after settings update.

## Troubleshooting
- SMTP auth errors: regenerate App Password and confirm 2FA.
- Empty digest: verify source URLs are HTTPS and domain is allowed.
- 409/queued response: digest run already active with queued job.
- Weather icons in email: icons are mapped from forecast description in backend and do not depend on remote image loading.

## Development notes
- Backend: TypeScript + Express + sqlite3
- Frontend: React 19 + Vite + Tailwind + React Query
- Root workspace scripts run both apps in parallel.

## Database schema
Tables:
- `sources`
- `topics`
- `settings`
- `digest_history`
- `allowed_domains`

## License
Private/local project template.
