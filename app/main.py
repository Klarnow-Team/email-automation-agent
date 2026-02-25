from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import subscribers, campaigns, automations, dashboard, workers, webhooks, segments, event_types, bookings, team_members, booking_profile, calendar, public_booking, tracking, audit, groups, tags, suppression, forms

settings = get_settings()
app = FastAPI(title="Klarnow mailing tool", version="0.1.0")

# Allow both common Next.js dev ports so OPTIONS preflight succeeds from either
_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins else ["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

app.include_router(subscribers.router, prefix="/api/subscribers", tags=["subscribers"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(automations.router, prefix="/api/automations", tags=["automations"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(segments.router, prefix="/api/segments", tags=["segments"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(suppression.router, prefix="/api/suppression", tags=["suppression"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(event_types.router, prefix="/api/event-types", tags=["event-types"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(team_members.router, prefix="/api/team-members", tags=["team-members"])
app.include_router(booking_profile.router, prefix="/api/booking-profile", tags=["booking-profile"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(public_booking.router, prefix="/api/public", tags=["public-booking"])
app.include_router(audit.router, prefix="/api/audit-logs", tags=["audit"])
app.include_router(tracking.router, tags=["tracking"])


# Uploaded campaign images (create dir and mount before other routes that might catch /uploads)
_uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
_uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

@app.get("/")
def root():
    return {"app": "Klarnow mailing tool", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve frontend static files in production (when frontend/out exists)
_frontend_out = Path(__file__).resolve().parent.parent / "frontend" / "out"
if settings.serve_static and _frontend_out.exists():
    # Next.js export: /campaigns, /subscribers, /automations are in root as *.html
    def _serve_page(path: str):
        f = _frontend_out / f"{path}.html"
        if f.is_file():
            return FileResponse(f, media_type="text/html")
        return FileResponse(_frontend_out / "index.html", media_type="text/html")

    @app.get("/campaigns")
    def _campaigns():
        return _serve_page("campaigns")

    @app.get("/subscribers")
    def _subscribers():
        return _serve_page("subscribers")

    @app.get("/automations")
    def _automations():
        return _serve_page("automations")

    @app.get("/bookings")
    def _bookings():
        return _serve_page("bookings")

    @app.get("/profile")
    def _profile():
        return _serve_page("profile")

    @app.get("/segments")
    def _segments():
        return _serve_page("segments")

    @app.get("/groups")
    def _groups():
        return _serve_page("groups")

    @app.get("/tags")
    def _tags():
        return _serve_page("tags")

    @app.get("/suppression")
    def _suppression():
        return _serve_page("suppression")

    @app.get("/forms")
    def _forms():
        return _serve_page("forms")

    @app.head("/campaigns")
    def _campaigns_head():
        return _serve_page("campaigns")

    @app.head("/subscribers")
    def _subscribers_head():
        return _serve_page("subscribers")

    @app.head("/automations")
    def _automations_head():
        return _serve_page("automations")

    @app.head("/bookings")
    def _bookings_head():
        return _serve_page("bookings")

    @app.head("/profile")
    def _profile_head():
        return _serve_page("profile")

    @app.head("/segments")
    def _segments_head():
        return _serve_page("segments")

    @app.head("/groups")
    def _groups_head():
        return _serve_page("groups")

    @app.head("/tags")
    def _tags_head():
        return _serve_page("tags")

    @app.head("/suppression")
    def _suppression_head():
        return _serve_page("suppression")

    @app.head("/forms")
    def _forms_head():
        return _serve_page("forms")

    app.mount("/", StaticFiles(directory=str(_frontend_out), html=True), name="frontend")
