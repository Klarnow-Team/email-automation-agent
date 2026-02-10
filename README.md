# Email Auto Agent

Email automation agent (MailerLite-style MVP) with **Resend** for sending, **FastAPI** backend, and **Next.js** frontend. Features: subscribers, one-off campaigns, and simple automations (e.g. welcome email when a subscriber is added).

---

## What's inside

- **Backend (FastAPI):** REST API for subscribers, campaigns, and automations. Resend is the only email sender. Data is stored in PostgreSQL (SQLAlchemy + Alembic).
- **Frontend (Next.js):** Static export dashboard: subscriber list/add/import, campaign create/send, automation create (trigger + steps: email, delay).
- **Single deploy:** Docker build compiles the frontend and serves it from the same container as the API.

---

## Quick start

### Backend

```bash
# Start Postgres (pick one):
#   Docker:  make db-up   then  export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_auto_agent
#   Local:   createdb email_auto_agent  and use  export DATABASE_URL=postgresql://localhost/email_auto_agent

# Env (optional; defaults shown)
export DATABASE_URL=postgresql://localhost/email_auto_agent
export RESEND_API_KEY=re_xxx          # required for sending
export RESEND_FROM_EMAIL=you@yourdomain.com

# Migrations
alembic upgrade head

# Run API
uvicorn app.main:app --reload --port 8000
```

### Frontend (dev)

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open **http://localhost:3000**. The Next.js app will call the API at `http://localhost:8000` (set `NEXT_PUBLIC_API_URL` accordingly).

### Production (Docker)

See **[DEPLOY.md](DEPLOY.md)** for Docker build, env vars, and platform notes.

```bash
docker build -t email-auto-agent .
docker run -p 8000:8000 -e DATABASE_URL=... -e RESEND_API_KEY=... email-auto-agent
```

Then open **http://localhost:8000** for the dashboard (static frontend is served by FastAPI).

---

## Project layout

```
email-auto-agent/
├── app/
│   ├── main.py           # FastAPI app, CORS, static mount, routers
│   ├── config.py         # Settings (DATABASE_URL, RESEND_*, CORS)
│   ├── database.py      # SQLAlchemy engine and session
│   ├── models/          # Subscriber, Campaign, CampaignRecipient, Automation, AutomationStep, AutomationRun
│   ├── schemas/         # Pydantic request/response
│   ├── routers/         # subscribers, campaigns, automations
│   └── services/        # resend_service, campaign_service, automation_service
├── alembic/             # Migrations
├── frontend/            # Next.js (static export → frontend/out)
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

---

## Resend setup

1. Create an API key in the [Resend dashboard](https://resend.com).
2. Verify your domain in Resend and set `RESEND_FROM_EMAIL` to a verified address (e.g. `noreply@yourdomain.com`).
3. Set `RESEND_API_KEY` in the environment. Without it, the app runs but sending is skipped (logged).

---

## API summary

| Area        | Endpoints                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Subscribers | `GET/POST /api/subscribers`, `GET/PATCH/DELETE /api/subscribers/{id}`, `POST /api/subscribers/import` |
| Campaigns   | `GET/POST /api/campaigns`, `GET /api/campaigns/{id}`, `POST /api/campaigns/{id}/send`                 |
| Automations | `GET/POST /api/automations`, `GET/PATCH /api/automations/{id}`, `POST /api/automations/{id}/trigger`  |
| Health      | `GET /health`                                                                                         |

All request/response bodies use JSON and Pydantic schemas.
