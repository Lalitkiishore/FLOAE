"""
App configuration, loaded from environment variables (.env in local dev,
real environment variables when deployed on Render).
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    database_url: str = ""
    # Comma-separated list of frontend URLs allowed to call the API
    frontend_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
