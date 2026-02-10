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


def get_settings() -> Settings:
    return Settings()
