from pydantic import field_validator
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
    # Optional display name for From (e.g. "Goodness"). Person-like names can help Gmail place mail in Primary.
    resend_from_name: str = ""
    # When set and sending from @resend.dev, all recipients are redirected here (e.g. delivered@resend.dev). Use for local testing.
    resend_sandbox_redirect: str = ""
    # Optional reply-to address; improves trust and reduces spam flags when set to a real address (e.g. support@yourdomain.com).
    resend_reply_to: str = ""

    # CORS (comma-separated origins; include all dev ports you use, e.g. 3000, 3001)
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    # Serve frontend static (set False when running Next.js in dev)
    serve_static: bool = True

    # Tracking (open/click) — base URL for tracking links in emails (e.g. https://api.example.com or http://localhost:8000)
    tracking_base_url: str = "http://localhost:8000"
    # Secret for signing tracking URLs (set in production to prevent fake events)
    tracking_secret: str = "change-me-in-production"
    # Frontend app URL (for unsubscribe redirect and email logo). When set, unsubscribe redirects here so users see the app's confirmation page. If unset, tracking_base_url is used.
    frontend_base_url: str = ""

    # Google Calendar OAuth (for calendar sync / busy detection)
    google_client_id: str = ""
    google_client_secret: str = ""
    # Redirect URI for OAuth callback (e.g. http://localhost:8000/api/calendar/callback)
    google_redirect_uri: str = ""

    # Inbound webhook (Zapier/Make) — API key in X-API-Key header. If empty, requests are rejected.
    inbound_webhook_api_key: str = ""

    # WhatsApp (Twilio) — for campaign channel "whatsapp". Leave empty to disable WhatsApp.
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    # WhatsApp sender number with whatsapp: prefix (e.g. whatsapp:+14155238886 for sandbox).
    twilio_whatsapp_from: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value


def get_settings() -> Settings:
    return Settings()
