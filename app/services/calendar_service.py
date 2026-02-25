"""Calendar sync: OAuth and fetch busy intervals from Google Calendar."""
import secrets
from datetime import datetime, timezone
from typing import List, Optional, Tuple
import urllib.parse

import httpx

from app.config import get_settings

# In-memory state for OAuth (use Redis/DB in production for multi-instance)
_oauth_state: dict = {}


def get_google_auth_url(team_member_id: int, redirect_uri: str) -> Tuple[str, str]:
    """Return (auth_url, state). Caller must store state to verify in callback."""
    settings = get_settings()
    if not settings.google_client_id:
        raise ValueError("Google Calendar is not configured (GOOGLE_CLIENT_ID missing)")
    state = secrets.token_urlsafe(32)
    _oauth_state[state] = {"team_member_id": team_member_id, "redirect_uri": redirect_uri}
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return url, state


def exchange_google_code(code: str, state: str, redirect_uri: str) -> Optional[dict]:
    """Exchange code for tokens. Returns dict with refresh_token, access_token, email; or None if state invalid."""
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        return None
    state_data = _oauth_state.pop(state, None)
    if not state_data:
        return None
    team_member_id = state_data["team_member_id"]
    with httpx.Client() as client:
        r = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code != 200:
        return None
    data = r.json()
    refresh_token = data.get("refresh_token")
    access_token = data.get("access_token")
    if not refresh_token and access_token:
        refresh_token = data.get("access_token")  # fallback for testing
    if not refresh_token:
        return None
    email = None
    if access_token:
        try:
            with httpx.Client() as info_client:
                info = info_client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if info.status_code == 200:
                    email = info.json().get("email")
        except Exception:
            pass
    return {
        "team_member_id": team_member_id,
        "refresh_token": refresh_token,
        "access_token": access_token,
        "email": email,
    }


def get_google_access_token(refresh_token: str) -> Optional[str]:
    """Refresh and return access_token for Google API calls."""
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        return None
    with httpx.Client() as client:
        r = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


def fetch_google_busy(
    refresh_token: str,
    from_ts: datetime,
    to_ts: datetime,
) -> List[Tuple[datetime, datetime]]:
    """Return list of (start, end) busy intervals in UTC from primary calendar."""
    access_token = get_google_access_token(refresh_token)
    if not access_token:
        return []
    # Freebusy: https://developers.google.com/calendar/api/v3/reference/freebusy/query
    body = {
        "timeMin": from_ts.isoformat(),
        "timeMax": to_ts.isoformat(),
        "items": [{"id": "primary"}],
    }
    with httpx.Client() as client:
        r = client.post(
            "https://www.googleapis.com/calendar/v3/freeBusy",
            json=body,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
    if r.status_code != 200:
        return []
    data = r.json()
    out: List[Tuple[datetime, datetime]] = []
    for cal_id, cal_data in data.get("calendars", {}).items():
        for busy in cal_data.get("busy", []):
            start_s = busy.get("start")
            end_s = busy.get("end")
            if start_s and end_s:
                try:
                    start_dt = datetime.fromisoformat(start_s.replace("Z", "+00:00"))
                    end_dt = datetime.fromisoformat(end_s.replace("Z", "+00:00"))
                    out.append((start_dt, end_dt))
                except (ValueError, TypeError):
                    pass
    return out
