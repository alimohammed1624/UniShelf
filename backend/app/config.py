from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Application
    DEBUG: bool = False
    APP_PORT: int = 8000

    # Database
    # These are optional because we prefer DATABASE_URL
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: int = 5432

    # DATABASE_URL is the primary connection string
    DATABASE_URL: str = "sqlite:///./unishelf.db"

    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str = "unishelf-uploads"
    MINIO_SECURE: bool = False

    # Security
    # Default provided for dev convenience, but should be overridden in prod
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
