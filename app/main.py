from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import subscribers, campaigns, automations

settings = get_settings()
app = FastAPI(title="Email Auto Agent", version="0.1.0")

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

    @app.head("/campaigns")
    def _campaigns_head():
        return _serve_page("campaigns")

    @app.head("/subscribers")
    def _subscribers_head():
        return _serve_page("subscribers")

    @app.head("/automations")
    def _automations_head():
        return _serve_page("automations")

    app.mount("/", StaticFiles(directory=str(_frontend_out), html=True), name="frontend")
