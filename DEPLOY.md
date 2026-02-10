# Deploy Email Auto Agent

This guide covers deploying the app so the dashboard and API are available at a single URL.

---

## Quick deploy with Docker

```bash
# Build (frontend is built inside the image)
docker build -t email-auto-agent .

# Run (set DATABASE_URL and RESEND_API_KEY)
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host/dbname \
  -e RESEND_API_KEY=re_xxx \
  email-auto-agent
```

Open **http://localhost:8000** for the dashboard. The API is at **http://localhost:8000/api/...**.

To use a different port:

```bash
docker run -p 3000:3000 -e PORT=3000 -e DATABASE_URL=... -e RESEND_API_KEY=... email-auto-agent
```

---

## Environment variables

Configure via env vars (no `.env` required in production).

| Variable            | Required | Description                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`      | Yes      | PostgreSQL connection URL (e.g. `postgresql://user:pass@host/dbname`).   |
| `RESEND_API_KEY`    | Yes\*    | Resend API key for sending email. If unset, sends are skipped (logged).  |
| `RESEND_FROM_EMAIL` | No       | From address (default: `onboarding@resend.dev`). Use a verified domain.  |
| `PORT`              | No       | Port the server listens on (default: `8000`).                            |
| `CORS_ORIGINS`      | No       | Comma-separated origins for CORS (default: `http://localhost:3000`).     |
| `SERVE_STATIC`      | No       | Set to `false` to disable serving frontend static files (default: true). |

\* Required for sending campaigns and automation emails.

---

## Build and run without Docker

From the repo root:

```bash
# Install backend deps
pip install -r requirements.txt

# Run migrations (create DB first: createdb email_auto_agent)
export DATABASE_URL=postgresql://localhost/email_auto_agent
alembic upgrade head

# Build frontend (required for serving dashboard from FastAPI)
cd frontend && npm ci && npm run build && cd ..

# Run
PORT=8000 uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or with Make:

```bash
make build-frontend   # one-time
make serve            # PORT=8000 by default; override with make serve PORT=3000
```

---

## Routes

| Path                                         | Description                       |
| -------------------------------------------- | --------------------------------- |
| `/`                                          | Dashboard (Next.js static).       |
| `/subscribers`, `/campaigns`, `/automations` | Frontend pages.                   |
| `/api/subscribers`                           | Subscriber CRUD and import.       |
| `/api/campaigns`                             | Campaign CRUD and send.           |
| `/api/automations`                           | Automation CRUD and trigger.      |
| `/health`                                    | Health check (`{"status":"ok"}`). |

---

## Deploying to Railway

1. **Create a project:** Go to [railway.app](https://railway.app), sign in, and click **New Project**.

2. **Add PostgreSQL:** In the project, click **+ New** → **Database** → **PostgreSQL**. Railway creates a Postgres service and exposes `DATABASE_URL` to the project.

3. **Deploy from GitHub:** Click **+ New** → **GitHub Repo**, select this repo, and deploy. Railway will detect the **Dockerfile** and use it. No buildpack or custom start command needed.

4. **Link the database:** In your **Service** (the web app), open **Variables**. Add a variable and reference the Postgres `DATABASE_URL`: click **Add variable** → **Add reference** and choose the `DATABASE_URL` from your Postgres service. (Or paste the connection string from the Postgres service’s **Variables** / **Connect** tab.)

5. **Set required env vars** in the service **Variables** tab:

   | Variable         | Value / note                                                                     |
   | ---------------- | -------------------------------------------------------------------------------- |
   | `DATABASE_URL`   | From Postgres (reference or paste; see step 4).                                  |
   | `RESEND_API_KEY` | Your Resend API key (e.g. `re_xxx`).                                             |
   | `CORS_ORIGINS`   | Your app URL, e.g. `https://your-app.up.railway.app` (optional but recommended). |

   Railway sets `PORT` automatically; the Dockerfile uses it.

6. **Generate domain:** In the service, open **Settings** → **Networking** → **Generate Domain** to get a public URL.

7. **Migrations:** The Docker image runs `alembic upgrade head` on startup, so the database is migrated on each deploy. No extra step needed.

After the deploy finishes, open the generated URL for the dashboard. The API is on the same origin (e.g. `https://your-app.up.railway.app/api/...`).

---

## Deploying to other platforms

- **Render / Fly.io:** Connect the repo, use the **Dockerfile**. Set `DATABASE_URL` and `RESEND_API_KEY` in the dashboard. They usually set `PORT` automatically.
- **Google Cloud Run / AWS ECS:** Build the image from the Dockerfile, push to your registry, run with `PORT=8080` (or the platform’s default) and the env vars above.
- **Single server:** `docker run` or `make serve` behind nginx/caddy with TLS.

After deploy, open the root URL for the dashboard; use the same origin for API calls when the frontend is served by FastAPI.
