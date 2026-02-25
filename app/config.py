from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    debug: bool = False

    # Database
    database_url: str = "postgresql://localhost/email_auto_agent"

    # Resend
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"
    # When set and sending from @resend.dev, all recipients are redirected here (e.g. delivered@resend.dev). Use for local testing.
    resend_sandbox_redirect: str = ""

    # CORS (comma-separated origins; include all dev ports you use, e.g. 3000, 3001)
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    # Serve frontend static (set False when running Next.js in dev)
    serve_static: bool = True

    # Tracking (open/click) — base URL for tracking links in emails (e.g. https://api.example.com or http://localhost:8000)
    tracking_base_url: str = "http://localhost:8000"
    # Secret for signing tracking URLs (set in production to prevent fake events)
    tracking_secret: str = "change-me-in-production"

    # Google Calendar OAuth (for calendar sync / busy detection)
    google_client_id: str = ""
    google_client_secret: str = ""
    # Redirect URI for OAuth callback (e.g. http://localhost:8000/api/calendar/callback)
    google_redirect_uri: str = ""


def get_settings() -> Settings:
    return Settings()
