"""Calendar connections: OAuth connect, list, disconnect."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.booking import CalendarConnection, TeamMember
from app.schemas.booking import CalendarConnectStart, CalendarConnectionResponse
from app.services import calendar_service

router = APIRouter()


@router.get("/connections", response_model=List[CalendarConnectionResponse])
def list_connections(
    team_member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List calendar connections, optionally filtered by team_member_id. refresh_token is never returned."""
    q = db.query(CalendarConnection).order_by(CalendarConnection.id)
    if team_member_id is not None:
        q = q.filter(CalendarConnection.team_member_id == team_member_id)
    return q.all()


@router.post("/connections/start")
def start_connect(body: CalendarConnectStart, db: Session = Depends(get_db)):
    """Start OAuth flow. Returns { auth_url, state }. Frontend redirects user to auth_url."""
    settings = get_settings()
    if body.provider != "google":
        raise HTTPException(status_code=400, detail="Only Google Calendar is supported at the moment")
    if not settings.google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    m = db.query(TeamMember).filter(TeamMember.id == body.team_member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    redirect_uri = settings.google_redirect_uri or (settings.cors_origins.split(",")[0].strip().rstrip("/") + "/api/calendar/callback")
    if not redirect_uri:
        redirect_uri = "http://localhost:8000/api/calendar/callback"
    try:
        auth_url, state = calendar_service.get_google_auth_url(body.team_member_id, redirect_uri)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"auth_url": auth_url, "state": state}


@router.get("/callback")
def oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """OAuth callback. Exchanges code for tokens and saves CalendarConnection, then redirects to frontend."""
    settings = get_settings()
    if error:
        return RedirectResponse(url="/bookings?calendar_error=" + (error or "unknown"), status_code=302)
    if not code or not state:
        return RedirectResponse(url="/bookings?calendar_error=missing_code", status_code=302)
    redirect_uri = settings.google_redirect_uri or (settings.cors_origins.split(",")[0].strip().rstrip("/") + "/api/calendar/callback")
    if not redirect_uri:
        redirect_uri = "http://localhost:8000/api/calendar/callback"
    result = calendar_service.exchange_google_code(code, state, redirect_uri)
    if not result:
        return RedirectResponse(url="/bookings?calendar_error=exchange_failed", status_code=302)
    conn = CalendarConnection(
        team_member_id=result["team_member_id"],
        provider="google",
        email=result.get("email"),
        refresh_token=result["refresh_token"],
        sync_enabled=True,
    )
    db.add(conn)
    db.commit()
    frontend_base = settings.cors_origins.split(",")[0].strip().rstrip("/") if settings.cors_origins else "http://localhost:3000"
    return RedirectResponse(url=frontend_base + "/bookings?calendar_connected=1", status_code=302)


@router.delete("/connections/{connection_id}", status_code=204)
def disconnect(connection_id: int, db: Session = Depends(get_db)):
    c = db.query(CalendarConnection).filter(CalendarConnection.id == connection_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(c)
    db.commit()
    return None
