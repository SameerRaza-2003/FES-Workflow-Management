from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_ENV: str = "dev"

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    MONGO_URI: str
    DB_NAME: str

    # Meta (Facebook / Instagram)
    META_APP_ID: str
    META_APP_SECRET: str
    META_REDIRECT_URI: str

    # LinkedIn (optional until you enable it)
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_REDIRECT_URI: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "forbid"

settings = Settings()
